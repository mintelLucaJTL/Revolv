using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using Microsoft.AspNetCore.Authorization;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/articles")]
    public class ArticleController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public ArticleController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        [HttpGet]
        public async Task<IActionResult> GetArticles()
        {
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();

            var articles = metrics
                .Select(m => new ArticleDTO
                {
                    Id = m.ArtikelId,
                    ArticleNumber = m.Sku,
                    Name = m.Name,
                    Category = m.Category,
                    ReturnRate = m.ReturnRatePercent
                })
                .ToList();

            return Ok(articles);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetArticleDetails(int id)
        {
            var displayInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { id }))
                .GetValueOrDefault(id);

            if (displayInfo == null)
            {
                return NotFound();
            }

            // AI rows keyed by ArtikelId only — article master data lives in WAWI, not revolv.
            var recommendations = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Where(r => r.ArtikelId == id)
                .ToListAsync();

            var articleDto = new ArticleDetailDTO
            {
                Id = displayInfo.ArtikelId,
                ArticleNumber = displayInfo.Sku,
                Name = displayInfo.Name,
                Category = displayInfo.Category,
                AiRecommendations = recommendations.Select(r => new AiRecommendationDetailDTO
                {
                    Id = r.Id,
                    ReturnRate = r.ReturnRate,
                    AiSummaryText = r.AiSummaryText,
                    IsFullyResolved = r.IsFullyResolved,

                    QualityIssues = r.QualityIssues.Select(q => new QualityIssueDTO
                    {
                        Id = q.Id,
                        IssueText = q.IssueText,
                        Status = q.Status
                    }).ToList(),

                    DescriptionProposals = r.DescriptionProposals.Select(d => new DescriptionProposalDTO
                    {
                        Id = d.Id,
                        CurrentText = d.CurrentText,
                        ProposedText = d.ProposedText,
                        Status = d.Status
                    }).ToList(),

                    ActionRecommendations = r.ActionRecommendations.Select(ar => new ActionRecommendationDTO
                    {
                        Id = ar.Id,
                        ActionText = ar.ActionText,
                        ImpactBadge = ar.ImpactBadge,
                        Priority = ar.Priority,
                        IsCompleted = ar.IsCompleted
                    }).ToList()
                }).ToList()
            };

            return Ok(articleDto);
        }
    }
}
