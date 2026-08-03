using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
using RevolvAPI.Services;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/ai")]
    public class AiRecommendationController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IArticleAnalysisService _articleAnalysisService;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public AiRecommendationController(AppDbContext ctx, IArticleAnalysisService articleAnalysisService, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _articleAnalysisService = articleAnalysisService;
            _returnAnalytics = returnAnalytics;
        }

        // Statuses that count as resolved; anything else is treated as open.
        private static readonly string[] ResolvedStatuses =
            { "Gelöst", "Erledigt", "Geschlossen", "Akzeptiert", "Abgeschlossen" };


        [HttpPatch("description/{id}/status")]
        public async Task<IActionResult> UpdateDescriptionStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _ctx.DescriptionProposals.FindAsync(id);
            if (proposal == null) return NotFound();

            proposal.Status = dto.Status;

            // Sync parent IsFullyResolved once every proposal is accepted or rejected.
            var recommendation = await _ctx.AiRecommendations
                .Include(r => r.DescriptionProposals)
                .FirstOrDefaultAsync(r => r.Id == proposal.AiRecommendationId);

            if (recommendation != null && recommendation.DescriptionProposals.Any())
            {
                recommendation.IsFullyResolved = recommendation.DescriptionProposals.All(p =>
                    p.Status == "Akzeptiert" || p.Status == "Abgelehnt");
            }

            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("description/{id}/text")]
        public async Task<IActionResult> UpdateDescriptionProposedText(int id, [FromBody] UpdateProposalTextDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _ctx.DescriptionProposals.FindAsync(id);
            if (proposal == null) return NotFound();

            proposal.ProposedText = dto.ProposedText;
            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("action/{id}/complete")]
        public async Task<IActionResult> SetActionCompletion(int id, [FromBody] UpdateCompletionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var action = await _ctx.ActionRecommendations.FindAsync(id);
            if (action == null) return NotFound();

            action.IsCompleted = dto.IsCompleted;
            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("quality/{id}/status")]
        public async Task<IActionResult> UpdateQualityStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var issue = await _ctx.QualityIssues.FindAsync(id);
            if (issue == null) return NotFound();

            issue.Status = dto.Status;
            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx);

            var rows = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Select(r => new
                {
                    r.Id,
                    r.ArtikelId,
                    r.ReturnRate,
                    HasQualityBadge = r.QualityIssues.Any(),
                    HasDescriptionBadge = r.DescriptionProposals.Any(),
                    HasRecommendationBadge = r.ActionRecommendations.Any(),
                    OpenCount = r.QualityIssues.Count(q => q.Status != "Erledigt") +
                                r.DescriptionProposals.Count(d => d.Status != "Erledigt") +
                                r.ActionRecommendations.Count(a => !a.IsCompleted),
                    ResolvedCount = r.QualityIssues.Count(q => q.Status == "Erledigt") +
                                 r.DescriptionProposals.Count(d => d.Status == "Erledigt") +
                                 r.ActionRecommendations.Count(a => a.IsCompleted),
                })
                .ToListAsync();

            var articleInfo = await _returnAnalytics.GetArticleDisplayInfoAsync(rows.Select(r => r.ArtikelId));

            var overview = rows.Select(r =>
            {
                var info = articleInfo.GetValueOrDefault(r.ArtikelId);
                return new AiRecommendationOverviewDto
                {
                    Id = r.Id,
                    ArticleNumber = info?.Sku ?? string.Empty,
                    Name = info?.Name ?? string.Empty,
                    Category = info?.Category ?? string.Empty,
                    ReturnRate = ReturnRateBandService.Classify(r.ReturnRate, yellowThreshold, redThreshold),
                    HasQualityBadge = r.HasQualityBadge,
                    HasDescriptionBadge = r.HasDescriptionBadge,
                    HasRecommendationBadge = r.HasRecommendationBadge,
                    OpenCount = r.OpenCount,
                    ResolvedCount = r.ResolvedCount,
                };
            }).ToList();

            return Ok(overview);
        }


        [HttpGet("recommendations/{articleId}")]
        public async Task<IActionResult> GetRecommendation(int articleId)
        {
            var recommendation = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .FirstOrDefaultAsync(r => r.ArtikelId == articleId);

            if (recommendation == null)
                return NotFound(new { message = "Keine KI-Empfehlungen für diesen Artikel gefunden." });

            var articleInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { articleId }))
                .GetValueOrDefault(articleId);

            var dto = new AiRecommendationDetailDto
            {
                ArticleId = articleId,
                ArticleNumber = articleInfo?.Sku,
                ArticleName = articleInfo?.Name,
                Category = articleInfo?.Category,
                AiSummaryText = recommendation.AiSummaryText,
                ReturnRate = recommendation.ReturnRate,
                IsFullyResolved = recommendation.IsFullyResolved,
                QualityIssues = recommendation.QualityIssues
                    .Select(q => new QualityIssueDetailDto
                    {
                        Id = q.Id,
                        IssueText = q.IssueText,
                        Status = q.Status
                    })
                    .ToList(),
                DescriptionProposals = recommendation.DescriptionProposals
                    .Select(d => new DescriptionProposalDetailDto
                    {
                        Id = d.Id,
                        CurrentText = d.CurrentText,
                        ProposedText = d.ProposedText,
                        Status = d.Status
                    })
                    .ToList(),
                ActionRecommendations = recommendation.ActionRecommendations
                    .Select(a => new ActionRecommendationDetailDto
                    {
                        Id = a.Id,
                        ActionText = a.ActionText,
                        ImpactBadge = a.ImpactBadge,
                        Priority = a.Priority,
                        IsCompleted = a.IsCompleted
                    })
                    .ToList()
            };

            return Ok(dto);
        }

        // POST api/ai/analyze/{articleId}
        // Startet die KI-Analyse für einen Artikel manuell. Die eigentliche Logik lebt in
        // ArticleAnalysisService (Ticket #252) und wird von dort auch vom automatischen
        // Background-Job (AutoAnalysisBackgroundService) für ShopSetting.AutoAnalyzeNewIssues
        // wiederverwendet.
        [HttpPost("analyze/{articleId}")]
        public async Task<IActionResult> AnalyzeArticle(int articleId)
        {
            var recommendationId = await _articleAnalysisService.AnalyzeArticleAsync(articleId);

            if (recommendationId == null)
            {
                return NotFound(new { message = "Artikel nicht gefunden." });
            }

            return Ok(new { recommendationId });
        }
    }
}
