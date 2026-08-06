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

        public async Task<int?> AnalyzeArticleAsync(int articleId, int companyId)
        {
            var articleInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { articleId }))
                .GetValueOrDefault(articleId);

            if (articleInfo == null)
            {
                return null;
            }

            // Nur die eigenen bisherigen Analysen als Kontext nutzen - sonst würden Rückgabegründe
            // oder Beschreibungstexte einer anderen Firma in die eigene KI-Anfrage einfließen.
            var existingRecommendations = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Where(r => r.ArtikelId == articleId && r.CompanyId == companyId)
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

            // Live return rate from WAWI sales/returns (same source as the dashboard).
            // DECIMAL(5,2) caps at 999.99 — clamp so extreme test rates still persist as "high".
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();
            var liveRate = metrics.FirstOrDefault(m => m.ArtikelId == articleId)?.ReturnRatePercent;
            var storedRate = liveRate.HasValue
                ? Math.Min(liveRate.Value, 999.99m)
                : (decimal?)null;

            // Antwort der KI in echte DB-Modelle umwandeln.
            var recommendation = new AiRecommendation
            {
                ArtikelId = articleId,
                CompanyId = companyId,
                AiSummaryText = aiResult.Summary,
                ReturnRate = storedRate,
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
