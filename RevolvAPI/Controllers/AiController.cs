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
    [Route("api/ai")]
    public class AiController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public AiController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        // filter: quality | description — optional badge filter for overview tiles
        [HttpGet("recommendations")]
        public async Task<IActionResult> GetRecommendations([FromQuery] string? filter = null)
        {
            var normalizedFilter = filter?.Trim().ToLowerInvariant();

            if (normalizedFilter is not (null or "" or "quality" or "description"))
            {
                return BadRequest("filter must be 'quality' or 'description'");
            }

            var companyId = User.GetCompanyId();
            IQueryable<AiRecommendation> query = _ctx.AiRecommendations
                .AsNoTracking()
                .Where(r => r.CompanyId == companyId);

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
                    r.ArtikelId,
                    r.ReturnRate,
                    HasQuality = r.QualityIssues.Any(),
                    HasDescription = r.DescriptionProposals.Any(),
                    OpenActionsCount = r.ActionRecommendations.Count(a => !a.IsCompleted),
                    TotalActionsCount = r.ActionRecommendations.Count(),
                })
                .ToListAsync();

            var articleInfo = await _returnAnalytics.GetArticleDisplayInfoAsync(rows.Select(r => r.ArtikelId));

            var dtos = rows.Select(r =>
            {
                var info = articleInfo.GetValueOrDefault(r.ArtikelId);
                return new AiRecommendationListDto
                {
                    Id = r.Id,
                    ArticleNumber = info?.Sku,
                    Name = info?.Name,
                    Category = info?.Category,
                    ReturnRate = r.ReturnRate,
                    OpenActionsCount = r.OpenActionsCount,
                    TotalActionsCount = r.TotalActionsCount,
                    Tags = BuildTags(r.HasQuality, r.HasDescription, r.OpenActionsCount > 0),
                };
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
