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
        // Do not filter to "has returns" only; green band includes 0% articles shared with the dashboard.
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
                .Include(r => r.DescriptionProposals)
                .Where(r => artikelIds.Contains(r.ArtikelId) && r.CompanyId == companyId)
                .ToListAsync();
            var aiRecsByArticle = aiRecommendations
                .GroupBy(r => r.ArtikelId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var dtos = metrics
                .Select(m =>
                {
                    var recs = aiRecsByArticle.GetValueOrDefault(m.ArtikelId);

                    var proposals = recs?.SelectMany(r => r.DescriptionProposals ?? new List<DescriptionProposal>()).ToList()
                        ?? new List<DescriptionProposal>();

                    string status;
                    if (recs == null || !recs.Any())
                    {
                        status = "Keine Empfehlung";
                    }
                    else if (proposals.Any())
                    {
                        if (proposals.All(p => p.Status == "Akzeptiert"))
                            status = "Angenommen";
                        else if (proposals.All(p => p.Status == "Abgelehnt"))
                            status = "Abgelehnt";
                        else
                            status = "Ausstehend";
                    }
                    else
                    {
                        status = recs.All(r => r.IsFullyResolved) ? "Gelöst" : "Ausstehend";
                    }

                    return new ArticleTableDTO
                    {
                        id = m.ArtikelId,
                        ArticleNumber = m.Sku,
                        Name = m.Name,
                        Category = m.Category,
                        ReturnRate = m.ReturnRatePercent,
                        AiStatus = status,
                        MostFrequentReason = m.MostFrequentReason
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
