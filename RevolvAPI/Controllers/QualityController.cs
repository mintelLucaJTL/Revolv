using Microsoft.AspNetCore.Mvc;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using RevolvAPI.Extensions;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/quality")]
    public class QualityController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public QualityController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        [HttpGet("open")]
        public async Task<IActionResult> GetOpenQualityIssues()
        {
            var companyId = User.GetCompanyId();

            // Tenant isolation: QualityIssues belong to an AiRecommendation; without CompanyId
            // any authenticated user could list other companies' open quality issues (IDOR).
            var issues = await _ctx.QualityIssues
                .AsNoTracking()
                .Include(q => q.AiRecommendation)
                .Where(q => q.Status != AiRecommendationStatuses.QualityIssueResolved
                            && q.AiRecommendation.CompanyId == companyId)
                .ToListAsync();

            var artikelIds = issues
                .Where(q => q.AiRecommendation != null)
                .Select(q => q.AiRecommendation.ArtikelId);
            var articleInfo = await _returnAnalytics.GetArticleDisplayInfoAsync(artikelIds);

            var dtos = issues.Select(q =>
            {
                var artikelId = q.AiRecommendation?.ArtikelId;
                var info = artikelId.HasValue ? articleInfo.GetValueOrDefault(artikelId.Value) : null;

                return new QualityIssueOpenDto
                {
                    Id = q.Id,
                    IssueText = q.IssueText,
                    AiRecommendationId = q.AiRecommendationId,
                    ArticleId = artikelId,
                    ArticleNumber = info?.Sku,
                    ArticleName = info?.Name,
                    Status = q.Status
                };
            }).ToList();

            return Ok(dtos);
        }
    }
}
