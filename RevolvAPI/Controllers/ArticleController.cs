using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/articles")]
    public class ArticleController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        public ArticleController(AppDbContext ctx) => _ctx = ctx;

        [HttpGet]
        public async Task<IActionResult> GetArticles()
        {
            var articles = await _ctx.Articles.Include(a => a.AiRecommendations)
                .Select(a => new ArticleDTO
                {
                    Id = a.Id,
                    ArticleNumber = a.ArticleNumber,
                    Name = a.Name,
                    Category = a.Category,
                    Size = a.Size,
                    ArtColor = a.Color,
                    ReturnRate = a.AiRecommendations.Select(r => r.ReturnRate).FirstOrDefault()
                })
                .ToListAsync();
            return Ok(articles);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetArticleDetails(int id)
        {
            var articleDto = await _ctx.Articles
                .Where(a => a.Id == id)
                .Select(a => new ArticleDetailDTO
                {
                    Id = a.Id,
                    ArticleNumber = a.ArticleNumber,
                    Name = a.Name,
                    Category = a.Category,
                    Size = a.Size,
                    ArtColor = a.Color,

                    // Wir mappen die Liste der Empfehlungen
                    AiRecommendations = a.AiRecommendations.Select(r => new AiRecommendationDetailDTO
                    {
                        Id = r.Id,
                        ReturnRate = r.ReturnRate,
                        AiSummaryText = r.AiSummaryText,
                        IsFullyResolved = r.IsFullyResolved,

                        // Wir mappen die drei Unterlisten direkt mit
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
                })
                .FirstOrDefaultAsync();

            // Wenn die ID nicht gefunden wurde (articleDto ist null)
            if (articleDto == null)
            {
                return NotFound();
            }

            return Ok(articleDto);
        }
    }
}
