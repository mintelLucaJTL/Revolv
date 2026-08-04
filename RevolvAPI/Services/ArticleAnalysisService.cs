using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    /// <inheritdoc cref="IArticleAnalysisService" />
    public class ArticleAnalysisService : IArticleAnalysisService
    {
        private readonly AppDbContext _ctx;
        private readonly IAiService _aiService;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public ArticleAnalysisService(AppDbContext ctx, IAiService aiService, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _aiService = aiService;
            _returnAnalytics = returnAnalytics;
        }

        public async Task<int?> AnalyzeArticleAsync(int articleId)
        {
            var articleInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { articleId }))
                .GetValueOrDefault(articleId);

            if (articleInfo == null)
            {
                return null;
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

            return recommendation.Id;
        }
    }
}
