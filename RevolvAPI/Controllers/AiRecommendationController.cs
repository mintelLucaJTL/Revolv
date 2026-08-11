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
        private readonly IWawiDescriptionPushService _wawiDescriptionPushService;

        public AiRecommendationController(
            AppDbContext ctx,
            IArticleAnalysisService articleAnalysisService,
            IReturnAnalyticsService returnAnalytics,
            IWawiDescriptionPushService wawiDescriptionPushService)
        {
            _ctx = ctx;
            _articleAnalysisService = articleAnalysisService;
            _returnAnalytics = returnAnalytics;
            _wawiDescriptionPushService = wawiDescriptionPushService;
        }

        [HttpPatch("description/{id}/status")]
        public async Task<IActionResult> UpdateDescriptionStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Ticket #271: keine Magic Strings ohne Validierung mehr in die Spalte durchreichen.
            if (!AiRecommendationStatuses.DescriptionProposalValues.Contains(dto.Status))
            {
                return BadRequest(
                    $"status muss einer von: {string.Join(", ", AiRecommendationStatuses.DescriptionProposalValues)} sein.");
            }

            var companyId = User.GetCompanyId();

            // Include(AiRecommendation) + CompanyId-Check: ohne das könnte jeder eingeloggte User
            // per erratener/durchprobierter Id fremde Firmen-Daten patchen (IDOR).
            var proposal = await _ctx.DescriptionProposals
                .Include(p => p.AiRecommendation)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (proposal == null || proposal.AiRecommendation.CompanyId != companyId) return NotFound();

            proposal.Status = dto.Status;
            // Erfolgsmessung-Feature: AcceptedAt markiert, wann der Vorschlag zuletzt akzeptiert
            // wurde - beim Zurücknehmen (Status wechselt weg von "Akzeptiert") wieder null, sonst
            // würde ein abgelehnter/zurückgesetzter Vorschlag fälschlich als "Änderung" auftauchen.
            proposal.AcceptedAt = dto.Status == AiRecommendationStatuses.DescriptionProposalAccepted
                ? proposal.AcceptedAt ?? DateTime.UtcNow
                : null;

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

        // POST api/ai/description/{id}/push-to-wawi
        // Übernimmt den (bereits akzeptierten) KI-Beschreibungsvorschlag in die live WAWI-
        // Artikelbeschreibung - der einzige Schreibzugriff dieser App auf eine sonst rein
        // lesend genutzte externe Datenbank, daher Admin-only (wie andere folgenreiche Aktionen,
        // siehe TeamController) und mit voller Absicherung in WawiDescriptionPushService
        // (Transaktion, Idempotenz-Claim, Audit-Log). Absichtlich ein eigener, zusätzlich
        // bestätigter Schritt nach dem Akzeptieren, nicht Teil davon.
        [HttpPost("description/{id}/push-to-wawi")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<IActionResult> PushDescriptionToWawi(int id)
        {
            var companyId = User.GetCompanyId();
            var userId = User.GetUserId();

            var result = await _wawiDescriptionPushService.PushAsync(id, companyId, userId);

            return result.Outcome switch
            {
                PushDescriptionOutcome.Success => Ok(new PushDescriptionResultDto
                {
                    RowsAffected = result.RowsAffected,
                    PushedAt = result.PushedAt,
                }),
                PushDescriptionOutcome.AlreadyPushed => Conflict(new PushDescriptionResultDto
                {
                    PushedAt = result.PushedAt,
                }),
                PushDescriptionOutcome.NotAccepted => UnprocessableEntity(new
                {
                    message = result.ErrorMessage
                        ?? "Der Vorschlag muss erst akzeptiert werden, bevor er in WAWI übernommen werden kann.",
                }),
                PushDescriptionOutcome.NotFound => NotFound(),
                PushDescriptionOutcome.NoWawiRows => NotFound(new
                {
                    message = "Für diesen Artikel wurden keine WAWI-Beschreibungszeilen gefunden.",
                }),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = result.ErrorMessage ?? "Die Übernahme in WAWI ist fehlgeschlagen.",
                }),
            };
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
            action.CompletedAt = dto.IsCompleted ? action.CompletedAt ?? DateTime.UtcNow : null;

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

            if (!AiRecommendationStatuses.QualityIssueValues.Contains(dto.Status))
            {
                return BadRequest(
                    $"status muss einer von: {string.Join(", ", AiRecommendationStatuses.QualityIssueValues)} sein.");
            }

            var companyId = User.GetCompanyId();

            var issue = await _ctx.QualityIssues
                .Include(q => q.AiRecommendation)
                .FirstOrDefaultAsync(q => q.Id == id);
            if (issue == null || issue.AiRecommendation.CompanyId != companyId) return NotFound();

            issue.Status = dto.Status;
            issue.ResolvedAt = dto.Status == AiRecommendationStatuses.QualityIssueResolved
                ? issue.ResolvedAt ?? DateTime.UtcNow
                : null;

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

            // Live rates from WAWI (same as dashboard) — AiRecommendations.ReturnRate is often
            // null on older rows and was never set before the analyze fix.
            var rateByArticle = (await _returnAnalytics.GetArticleReturnMetricsAsync())
                .ToDictionary(m => m.ArtikelId, m => m.ReturnRatePercent);

            var overview = latestPerArticle.Select(r =>
            {
                var info = articleInfo.GetValueOrDefault(r.ArtikelId);
                var progress = AiRecommendationProgress.Count(r);
                var returnRate = rateByArticle.TryGetValue(r.ArtikelId, out var liveRate)
                    ? liveRate
                    : r.ReturnRate;
                return new AiRecommendationOverviewDto
                {
                    // articleId = WAWI-Artikel; recommendationId = AiRecommendation-PK.
                    // Niemals vermischen — Detailpanel ruft GET /api/articles/{articleId} auf.
                    ArticleId = r.ArtikelId,
                    RecommendationId = r.Id,
                    ArticleNumber = info?.Sku ?? string.Empty,
                    Name = info?.Name ?? string.Empty,
                    Category = info?.Category ?? string.Empty,
                    ReturnRate = ReturnRateBandService.Classify(returnRate, yellowThreshold, redThreshold),
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

            var liveRate = (await _returnAnalytics.GetArticleReturnMetricsAsync())
                .FirstOrDefault(m => m.ArtikelId == articleId)?.ReturnRatePercent;

            var dto = new AiRecommendationDetailDto
            {
                ArticleId = articleId,
                ArticleNumber = articleInfo?.Sku,
                ArticleName = articleInfo?.Name,
                Category = articleInfo?.Category,
                AiSummaryText = recommendation.AiSummaryText,
                ReturnRate = liveRate ?? recommendation.ReturnRate,
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
                        Status = d.Status,
                        PushedToWawiAt = d.PushedToWawiAt
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

