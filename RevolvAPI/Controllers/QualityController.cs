using Microsoft.AspNetCore.Mvc;
using RevolvAPI.Controllers;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using Microsoft.EntityFrameworkCore;
namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/quality")]
    public class QualityController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public QualityController(AppDbContext ctx) => _ctx = ctx;

        // GET api/quality/open
        // Liefert eine Liste aller offenen/ausstehenden QualityIssues,
        // inkl. Artikelnummer und -name zur Anzeige in der Übersichtstabelle.
        [HttpGet("open")]
        public async Task<IActionResult> GetOpenQualityIssues()
        {
            // Definiere, welche Status als "offen" gelten
            var openStatuses = new[] { "Ausstehend", "Offen" };

            // Lade nur die benötigten Felder:
            // Include + ThenInclude stellen sicher, dass EF Core die Navigationen laden kann,
            // damit wir aus den verknüpften Entitäten die Artikeldaten auslesen können.
            var issues = await _ctx.QualityIssues
                .Where(q => q.Status != null && openStatuses.Contains(q.Status))
                .Include(q => q.AiRecommendation)
                    .ThenInclude(ar => ar.Article)
                .Select(q => new QualityIssueOpenDto
                {
                    Id = q.Id,
                    IssueText = q.IssueText ?? string.Empty,
                    AiRecommendationId = q.AiRecommendationId,
                    ArticleId = q.AiRecommendation != null ? q.AiRecommendation.Article.Id : (int?)null,
                    ArticleNumber = q.AiRecommendation != null ? q.AiRecommendation.Article.ArticleNumber : null,
                    ArticleName = q.AiRecommendation != null ? q.AiRecommendation.Article.Name : null,
                    Status = q.Status ?? string.Empty
                })
                .ToListAsync();

           
            return Ok(issues);
        }
    }
}