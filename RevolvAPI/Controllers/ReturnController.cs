using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Extensions;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/articles")]
    public class ReturnController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public ReturnController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        // band (optional): "red" | "yellow" | "green" — same thresholds as dashboard traffic lights.
        // Green is > 0% and below the yellow threshold; 0% articles are excluded (same as Ampel KPIs).
        [HttpGet("returns")]
        public async Task<IActionResult> GetArticleReturns([FromQuery] string? band = null)
        {
            var companyId = User.GetCompanyId();
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            var artikelIds = metrics.Select(m => m.ArtikelId).ToList();
            // Nach CompanyId gefiltert: der KI-Status in der Tabelle darf nicht die
            // Empfehlungen einer anderen Firma widerspiegeln.
            var aiRecommendations = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Where(r => artikelIds.Contains(r.ArtikelId) && r.CompanyId == companyId)
                .ToListAsync();

            // Same active recommendation as detail modal / KI-Hub (#242) — not a merge of history.
            var latestByArticle = AiRecommendationProgress.SelectLatestPerArticle(aiRecommendations)
                .ToDictionary(r => r.ArtikelId);

            var dtos = metrics
                .Select(m =>
                {
                    latestByArticle.TryGetValue(m.ArtikelId, out var latest);
                    var proposals = latest?.DescriptionProposals?.ToList()
                        ?? new List<DescriptionProposal>();

                    string status;
                    if (latest == null)
                    {
                        status = ArticleAiStatuses.NoRecommendation;
                    }
                    else if (proposals.Any())
                    {
                        if (proposals.All(p => p.Status == AiRecommendationStatuses.DescriptionProposalAccepted))
                            status = ArticleAiStatuses.Accepted;
                        else if (proposals.All(p => p.Status == AiRecommendationStatuses.DescriptionProposalRejected))
                            status = ArticleAiStatuses.Rejected;
                        else
                            status = ArticleAiStatuses.Pending;
                    }
                    else
                    {
                        status = latest.IsFullyResolved ? ArticleAiStatuses.Resolved : ArticleAiStatuses.Pending;
                    }

                    return new ArticleTableDTO
                    {
                        id = m.ArtikelId,
                        ArticleNumber = m.Sku,
                        Name = m.Name,
                        Category = m.Category,
                        ReturnRate = m.ReturnRatePercent,
                        AiStatus = status,
                        MostFrequentReason = m.MostFrequentReason,
                        // Folge-Ticket zu "KI-Lösungs-Hub in Retouren-Analyse zusammenlegen":
                        // dieselben drei Tags, die vorher nur der separate Hub zeigte.
                        HasQualityBadge = latest?.QualityIssues.Any() ?? false,
                        HasDescriptionBadge = latest?.DescriptionProposals.Any() ?? false,
                        HasRecommendationBadge = latest?.ActionRecommendations.Any() ?? false,
                        AllActionsCompleted = latest != null
                            && latest.ActionRecommendations.Any()
                            && latest.ActionRecommendations.All(a => a.IsCompleted),
                        IsFullyResolved = latest?.IsFullyResolved ?? false,
                    };
                })
                .OrderByDescending(d => d.ReturnRate)
                .ToList();

            if (!string.IsNullOrEmpty(band))
            {
                var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx, companyId);

                List<ArticleTableDTO>? filtered = band.ToLowerInvariant() switch
                {
                    "red" or "yellow" or "green" => dtos
                        .Where(d => ReturnRateBandService.IsInBand(d.ReturnRate, band, yellowThreshold, redThreshold))
                        .ToList(),
                    _ => null,
                };

                if (filtered == null)
                {
                    return BadRequest("band must be red, yellow or green");
                }

                dtos = filtered;
            }

            return Ok(dtos);
        }
    }
}
