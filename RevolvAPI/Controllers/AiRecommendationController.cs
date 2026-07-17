using Microsoft.AspNetCore.Mvc;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using Microsoft.AspNetCore.Mvc;
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