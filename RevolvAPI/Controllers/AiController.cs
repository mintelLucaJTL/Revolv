using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/ai")]
    public class AiController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public AiController(AppDbContext ctx) => _ctx = ctx;

        // GET api/ai/recommendations?filter=quality|description
        // Kompakte Liste aller Artikel mit offenen KI-Maßnahmen für die Übersichtskacheln
        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations([FromQuery] string? filter = null)
        {
            var normalizedFilter = filter?.Trim().ToLowerInvariant();

            if (normalizedFilter is not (null or "" or "quality" or "description"))
            {
                return BadRequest("filter must be 'quality' or 'description'");
            }

            IQueryable<AiRecommendation> query = _ctx.AiRecommendations.AsNoTracking();

            query = normalizedFilter switch
            {
                "quality" => query.Where(r => r.QualityIssues.Any()),
                "description" => query.Where(r => r.DescriptionProposals.Any()),
                _ => query,
            };

            var rows = await query
                .Select(r => new
                {
                    r.Id,
                    r.Article.ArticleNumber,
                    r.Article.Name,
                    r.Article.Category,
                    r.Article.Size,
                    r.ReturnRate,
                    HasQuality = r.QualityIssues.Any(),
                    HasDescription = r.DescriptionProposals.Any(),
                    OpenActionsCount = r.ActionRecommendations.Count(a => !a.IsCompleted),
                    TotalActionsCount = r.ActionRecommendations.Count(),
                })
                .ToListAsync();

            var dtos = rows.Select(r => new AiRecommendationListDto
            {
                Id = r.Id,
                ArticleNumber = r.ArticleNumber,
                Name = r.Name,
                Category = r.Category,
                Size = r.Size,
                ReturnRate = r.ReturnRate,
                OpenActionsCount = r.OpenActionsCount,
                TotalActionsCount = r.TotalActionsCount,
                Tags = BuildTags(r.HasQuality, r.HasDescription, r.OpenActionsCount > 0),
            }).ToList();

            return Ok(dtos);
        }

        private static List<string> BuildTags(bool hasQuality, bool hasDescription, bool hasOpenActions)
        {
            var tags = new List<string>();
            if (hasQuality) tags.Add("Qualität");
            if (hasDescription) tags.Add("Beschreibung");
            if (hasOpenActions) tags.Add("Empfehlungen");
            return tags;
        }
    }
}