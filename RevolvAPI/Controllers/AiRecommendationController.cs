using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Extensions;
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

        [HttpPatch("description/{id}/status")]
        public async Task<IActionResult> UpdateDescriptionStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var companyId = User.GetCompanyId();

            // Include(AiRecommendation) + CompanyId-Check: ohne das könnte jeder eingeloggte User
            // per erratener/durchprobierter Id fremde Firmen-Daten patchen (IDOR).
            var proposal = await _ctx.DescriptionProposals
                .Include(p => p.AiRecommendation)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (proposal == null || proposal.AiRecommendation.CompanyId != companyId) return NotFound();

            proposal.Status = dto.Status;

            var recommendation = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .FirstOrDefaultAsync(r => r.Id == proposal.AiRecommendationId);

            if (recommendation != null)
            {
                recommendation.IsFullyResolved = AiRecommendationProgress.Count(recommendation).IsFullyResolved;
            }

            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("description/{id}/text")]
        public async Task<IActionResult> UpdateDescriptionProposedText(int id, [FromBody] UpdateProposalTextDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var companyId = User.GetCompanyId();

            var proposal = await _ctx.DescriptionProposals
                .Include(p => p.AiRecommendation)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (proposal == null || proposal.AiRecommendation.CompanyId != companyId) return NotFound();

            proposal.ProposedText = dto.ProposedText;
            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("action/{id}/complete")]
        public async Task<IActionResult> SetActionCompletion(int id, [FromBody] UpdateCompletionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var companyId = User.GetCompanyId();

            var action = await _ctx.ActionRecommendations
                .Include(a => a.AiRecommendation)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (action == null || action.AiRecommendation?.CompanyId != companyId) return NotFound();

            action.IsCompleted = dto.IsCompleted;

            var recommendation = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .FirstOrDefaultAsync(r => r.Id == action.AiRecommendationId);

            if (recommendation != null)
            {
                recommendation.IsFullyResolved = AiRecommendationProgress.Count(recommendation).IsFullyResolved;
            }

            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("quality/{id}/status")]
        public async Task<IActionResult> UpdateQualityStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var companyId = User.GetCompanyId();

            var issue = await _ctx.QualityIssues
                .Include(q => q.AiRecommendation)
                .FirstOrDefaultAsync(q => q.Id == id);
            if (issue == null || issue.AiRecommendation.CompanyId != companyId) return NotFound();

            issue.Status = dto.Status;

            var recommendation = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .FirstOrDefaultAsync(r => r.Id == issue.AiRecommendationId);

            if (recommendation != null)
            {
                recommendation.IsFullyResolved = AiRecommendationProgress.Count(recommendation).IsFullyResolved;
            }

            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Overview cards for the KI-Hub. Returns one row per article using the newest
        /// recommendation. <c>articleId</c> is for GET /api/articles/{id}; <c>recommendationId</c>
        /// is the AiRecommendations PK — do not interchange them.
        /// </summary>
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var companyId = User.GetCompanyId();
            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx, companyId);

            var allRows = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Where(r => r.CompanyId == companyId)
                .ToListAsync();

            // Ein Artikel kann mehrere Analysen haben (jede "KI-Analyse generieren" legt eine neue
            // AiRecommendation-Zeile an) — für die Übersicht zählt nur die jeweils neueste pro
            // Artikel, sonst tauchen re-analysierte Artikel doppelt auf.
            var latestPerArticle = AiRecommendationProgress.SelectLatestPerArticle(allRows).ToList();

            var articleInfo = await _returnAnalytics.GetArticleDisplayInfoAsync(
                latestPerArticle.Select(r => r.ArtikelId));

            var overview = latestPerArticle.Select(r =>
            {
                var info = articleInfo.GetValueOrDefault(r.ArtikelId);
                var progress = AiRecommendationProgress.Count(r);
                return new AiRecommendationOverviewDto
                {
                    // articleId = WAWI-Artikel; recommendationId = AiRecommendation-PK.
                    // Niemals vermischen — Detailpanel ruft GET /api/articles/{articleId} auf.
                    ArticleId = r.ArtikelId,
                    RecommendationId = r.Id,
                    ArticleNumber = info?.Sku ?? string.Empty,
                    Name = info?.Name ?? string.Empty,
                    Category = info?.Category ?? string.Empty,
                    ReturnRate = ReturnRateBandService.Classify(r.ReturnRate, yellowThreshold, redThreshold),
                    HasQualityBadge = r.QualityIssues.Any(),
                    HasDescriptionBadge = r.DescriptionProposals.Any(),
                    HasRecommendationBadge = r.ActionRecommendations.Any(),
                    OpenCount = progress.OpenCount,
                    ResolvedCount = progress.ResolvedCount,
                };
            }).ToList();

            return Ok(overview);
        }


        [HttpGet("recommendations/{articleId}")]
        public async Task<IActionResult> GetRecommendation(int articleId)
        {
            var companyId = User.GetCompanyId();

            // Active = newest by IDENTITY id (shared OrderNewestFirst). Include proposals so
            // currentDescription / text proposals are present for the detail UI (#242).
            var recommendation = await AiRecommendationProgress.OrderNewestFirst(
                    _ctx.AiRecommendations
                        .AsNoTracking()
                        .Include(r => r.QualityIssues)
                        .Include(r => r.DescriptionProposals)
                        .Include(r => r.ActionRecommendations)
                        .Where(r => r.ArtikelId == articleId && r.CompanyId == companyId))
                .FirstOrDefaultAsync();

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
        // wiederverwendet. Leere/ungültige KI-Ergebnisse werden nicht persistiert (#242).
        [HttpPost("analyze/{articleId}")]
        public async Task<IActionResult> AnalyzeArticle(int articleId)
        {
            var result = await _articleAnalysisService.AnalyzeArticleAsync(articleId, User.GetCompanyId());

            return result.Status switch
            {
                ArticleAnalysisStatus.ArticleNotFound =>
                    NotFound(new { message = "Artikel nicht gefunden." }),
                ArticleAnalysisStatus.EmptyOrInvalidAiResult =>
                    UnprocessableEntity(new
                    {
                        message = "Die KI-Analyse lieferte kein gültiges Ergebnis. Bitte erneut versuchen.",
                    }),
                ArticleAnalysisStatus.Success =>
                    Ok(new { recommendationId = result.RecommendationId }),
                _ => StatusCode(StatusCodes.Status500InternalServerError),
            };
        }
    }
}

