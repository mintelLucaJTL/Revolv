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

        public async Task<ArticleAnalysisResult> AnalyzeArticleAsync(int articleId, int companyId)
        {
            var articleInfo = (await _returnAnalytics.GetArticleDisplayInfoAsync(new[] { articleId }))
                .GetValueOrDefault(articleId);

            if (articleInfo == null)
            {
                return ArticleAnalysisResult.NotFound();
            }

            // Live return rate for the new row (Ticket #242) — same source as the returns table.
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();
            var returnRate = metrics.FirstOrDefault(m => m.ArtikelId == articleId)?.ReturnRatePercent;

            // Nur die eigenen bisherigen Analysen als Kontext nutzen - sonst würden Rückgabegründe
            // oder Beschreibungstexte einer anderen Firma in die eigene KI-Anfrage einfließen.
            // DescriptionProposals müssen geladen sein, sonst bleibt currentDescription leer (#242).
            var existingRecommendations = await _ctx.AiRecommendations
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Where(r => r.ArtikelId == articleId && r.CompanyId == companyId)
                .OrderByDescending(r => r.Id)
                .ToListAsync();

            // Retourengründe aus allen bisherigen QualityIssues des Artikels sammeln.
            var returnReasons = existingRecommendations
                .SelectMany(r => r.QualityIssues)
                .Select(q => q.IssueText)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Select(t => t!)
                .Distinct()
                .ToList();

            var mostFrequentReason = metrics.FirstOrDefault(m => m.ArtikelId == articleId)?.MostFrequentReason;
            if (!string.IsNullOrWhiteSpace(mostFrequentReason) &&
                !returnReasons.Contains(mostFrequentReason, StringComparer.OrdinalIgnoreCase))
            {
                returnReasons.Add(mostFrequentReason);
            }

            // Neueste Recommendation zuerst (bereits OrderByDescending Id) — CurrentText der
            // aktiven Analyse an die KI übergeben, nicht eine ältere/leere Zeile.
            var currentDescription = existingRecommendations
                .SelectMany(r => r.DescriptionProposals)
                .Select(d => d.CurrentText)
                .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t))
                ?? existingRecommendations
                    .SelectMany(r => r.DescriptionProposals)
                    .Select(d => d.ProposedText)
                    .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));

            var aiResult = await _aiService.AnalyzeArticleAsync(
                articleInfo.Name ?? "Unbekannter Artikel",
                currentDescription,
                returnReasons);

            if (!AiRecommendationContentRules.IsUsable(aiResult))
            {
                return ArticleAnalysisResult.EmptyOrInvalidAiResult();
            }

            // Antwort der KI in echte DB-Modelle umwandeln.
            var recommendation = new AiRecommendation
            {
                ArtikelId = articleId,
                CompanyId = companyId,
                AiSummaryText = aiResult!.Summary,
                ReturnRate = returnRate,
                IsFullyResolved = false,
            };

            foreach (var proposal in aiResult.DescriptionProposals
                         .Where(p => !string.IsNullOrWhiteSpace(p.ProposedText)))
            {
                recommendation.DescriptionProposals.Add(new DescriptionProposal
                {
                    CurrentText = proposal.CurrentText ?? currentDescription,
                    ProposedText = proposal.ProposedText,
                    Status = "Ausstehend",
                });
            }

            foreach (var action in aiResult.ActionRecommendations
                         .Where(a => !string.IsNullOrWhiteSpace(a.ActionText)))
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

            return ArticleAnalysisResult.Ok(recommendation.Id);
        }
    }
}
