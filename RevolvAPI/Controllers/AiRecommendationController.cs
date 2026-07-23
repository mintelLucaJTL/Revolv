using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.DTOs;
using System.Threading.Tasks;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/ai")]
    public class AiRecommendationController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public AiRecommendationController(AppDbContext ctx) => _ctx = ctx;

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
            var overview = await _ctx.AiRecommendations
                .Include(r => r.Article)
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Select(r => new AiRecommendationOverviewDto
                {
                    Id = r.Id,
                    ArticleNumber = r.Article.ArticleNumber,
                    Name = r.Article.Name,
                    Category = r.Article.Category,
                    Size = r.Article.Size,
                    ReturnRate = r.ReturnRate.HasValue ? (r.ReturnRate.Value > 0.2m ? "high" : r.ReturnRate.Value > 0.1m ? "medium" : "low") : "low",
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

            return Ok(overview);
        }

    }
}