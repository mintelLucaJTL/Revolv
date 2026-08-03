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
        private readonly IAiService _aiService;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public AiRecommendationController(AppDbContext ctx, IAiService aiService, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _aiService = aiService;
            _returnAnalytics = returnAnalytics;
        }

        // Status values that mark an AI task as resolved. Any other value
        // (e.g. "Offen", "Ausstehend", "In Prüfung", "Ticket erstellt") counts as open.
        private static readonly string[] ResolvedStatuses =
            { "Gelöst", "Erledigt", "Geschlossen", "Akzeptiert", "Abgeschlossen" };


        [HttpPatch("description/{id}/status")]
        public async Task<IActionResult> UpdateDescriptionStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _ctx.DescriptionProposals.FindAsync(id);
            if (proposal == null) return NotFound();

            proposal.Status = dto.Status;

            // Keep the parent recommendation's resolved flag in sync: once every description
            // proposal has been reviewed (accepted or rejected), the recommendation counts as
            // resolved for the "KI-Status" column and the dashboard KPIs. Undoing a review
            // (status back to "Ausstehend") automatically reopens it again.
            var recommendation = await _ctx.AiRecommendations
                .Include(r => r.DescriptionProposals)
                .FirstOrDefaultAsync(r => r.Id == proposal.AiRecommendationId);

            if (recommendation != null && recommendation.DescriptionProposals.Any())
            {
                recommendation.IsFullyResolved = recommendation.DescriptionProposals.All(p =>
                    p.Status == "Akzeptiert" || p.Status == "Abgelehnt");
            }

            await _ctx.SaveChangesAsync();

            return NoContent(); // 204 - Änderung erfolgreich gespeichert
        }

        // PATCH api/ai/description/{id}/text
        // Saves a user-edited version of the AI-proposed description text.
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

        // PATCH api/ai/action/{id}/complete
        // Setzt das Feld 'IsCompleted' für eine ActionRecommendation auf true/false.
        // Prüft Existenz und speichert die Änderung.
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
        // PATCH api/ai/quality/{id}/status
        // Aktualisiert das Status-Feld eines QualityIssue-Eintrags.
        // Gleiche Pattern: Validierung → Laden → Aktualisieren → SaveChanges.

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

            // In DTO umwandeln ohne Circular References
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
        // Startet die KI-Analyse für einen Artikel und persistiert das Ergebnis als neue
        // AiRecommendation inkl. DescriptionProposal und ActionRecommendations.
        [HttpPost("analyze/{articleId}")]
        public async Task<IActionResult> AnalyzeArticle(int articleId)
        {
            var articleInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { articleId }))
                .GetValueOrDefault(articleId);

            if (articleInfo == null)
            {
                return NotFound(new { message = "Artikel nicht gefunden." });
            }

            var existingRecommendations = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Where(r => r.ArtikelId == articleId)
                .ToListAsync();

            // Retourengründe aus allen bisherigen QualityIssues des Artikels sammeln.
            var returnReasons = existingRecommendations
                .SelectMany(r => r.QualityIssues)
                .Select(q => q.IssueText)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Select(t => t!)
                .Distinct()
                .ToList();

            var currentDescription = existingRecommendations
                .SelectMany(r => r.DescriptionProposals)
                .Select(d => d.CurrentText)
                .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));

            var aiResult = await _aiService.AnalyzeArticleAsync(
                articleInfo.Name ?? "Unbekannter Artikel",
                currentDescription,
                returnReasons);

            // Antwort der KI in echte DB-Modelle umwandeln.
            var recommendation = new AiRecommendation
            {
                ArtikelId = articleId,
                AiSummaryText = aiResult.Summary,
                IsFullyResolved = false,
            };

            foreach (var proposal in aiResult.DescriptionProposals)
            {
                recommendation.DescriptionProposals.Add(new DescriptionProposal
                {
                    CurrentText = proposal.CurrentText ?? currentDescription,
                    ProposedText = proposal.ProposedText,
                    Status = "Ausstehend",
                });
            }

            foreach (var action in aiResult.ActionRecommendations)
            {
                recommendation.ActionRecommendations.Add(new ActionRecommendation
                {
                    ActionText = action.ActionText,
                    ImpactBadge = action.ImpactBadge,
                    Priority = action.Priority,
                    IsCompleted = false,
                });
            }

            _ctx.AiRecommendations.Add(recommendation);
            await _ctx.SaveChangesAsync();

            return Ok(new { recommendationId = recommendation.Id });
        }
    }
}
