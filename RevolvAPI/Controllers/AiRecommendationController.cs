using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
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

        // GET api/ai/overview
        // Returns every article that has a linked AI recommendation, including the
        // badge flags to render and the open/resolved progress of its AI tasks.
        [HttpGet("overview")]
        public async Task<IActionResult> GetAiOverview()
        {
            var overview = await _ctx.Articles
                // Only include articles that have a linked AI recommendation.
                .Where(a => a.AiRecommendations.Any())
                .Select(a => new AiOverviewDTO
                {
                    ArticleNumber = a.ArticleNumber,
                    Name = a.Name,
                    Category = a.Category,
                    Size = a.Size,
                    ReturnRate = a.AiRecommendations.Select(r => r.ReturnRate).FirstOrDefault(),

                    // A badge is shown when at least one entry of that type exists.
                    HasQualityBadge = a.AiRecommendations.SelectMany(r => r.QualityIssues).Any(),
                    HasDescriptionBadge = a.AiRecommendations.SelectMany(r => r.DescriptionProposals).Any(),
                    HasRecommendationBadge = a.AiRecommendations.SelectMany(r => r.ActionRecommendations).Any(),

                    // Open tasks: actions via IsCompleted, quality/description via Status.
                    OpenCount =
                        a.AiRecommendations.SelectMany(r => r.QualityIssues)
                            .Count(q => q.Status == null || !ResolvedStatuses.Contains(q.Status)) +
                        a.AiRecommendations.SelectMany(r => r.DescriptionProposals)
                            .Count(d => !ResolvedStatuses.Contains(d.Status)) +
                        a.AiRecommendations.SelectMany(r => r.ActionRecommendations)
                            .Count(ar => !ar.IsCompleted),

                    // Resolved tasks: the counterpart of the open count.
                    ResolvedCount =
                        a.AiRecommendations.SelectMany(r => r.QualityIssues)
                            .Count(q => q.Status != null && ResolvedStatuses.Contains(q.Status)) +
                        a.AiRecommendations.SelectMany(r => r.DescriptionProposals)
                            .Count(d => ResolvedStatuses.Contains(d.Status)) +
                        a.AiRecommendations.SelectMany(r => r.ActionRecommendations)
                            .Count(ar => ar.IsCompleted)
                })
                .ToListAsync();

            return Ok(overview);
        }


        [HttpPatch("description/{id}/status")]
        public async Task<IActionResult> UpdateDescriptionStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _ctx.DescriptionProposals.FindAsync(id);
            if (proposal == null) return NotFound();

            proposal.Status = dto.Status;
            await _ctx.SaveChangesAsync();

            return NoContent(); // 204 - Änderung erfolgreich gespeichert
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
    }
}