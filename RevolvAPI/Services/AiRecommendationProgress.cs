using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Entity-aware wrappers around <see cref="AiRecommendationProgressRules"/>.
    /// Active/newest recommendation = highest <see cref="AiRecommendation.Id"/>
    /// (IDENTITY creation order, descending) — shared by article detail, KI-Hub, and table status.
    /// </summary>
    public static class AiRecommendationProgress
    {
        public static AiRecommendationProgressCounts Count(AiRecommendation recommendation) =>
            AiRecommendationProgressRules.Count(
                recommendation.QualityIssues.Select(q => q.Status),
                recommendation.DescriptionProposals.Select(d => d.Status),
                recommendation.ActionRecommendations.Select(a => a.IsCompleted));

        /// <summary>
        /// One active (newest) recommendation per article — historical analyses are collapsed.
        /// </summary>
        public static IEnumerable<AiRecommendation> SelectLatestPerArticle(
            IEnumerable<AiRecommendation> recommendations) =>
            recommendations
                .GroupBy(r => r.ArtikelId)
                .Select(g => OrderNewestFirst(g).First());

        /// <summary>
        /// Canonical newest-first ordering for recommendation lists (e.g. GET /api/articles/{id}).
        /// </summary>
        public static IOrderedEnumerable<AiRecommendation> OrderNewestFirst(
            IEnumerable<AiRecommendation> recommendations) =>
            recommendations.OrderByDescending(r => r.Id);

        /// <summary>
        /// EF-translatable newest-first ordering (IDENTITY id descending).
        /// </summary>
        public static IOrderedQueryable<AiRecommendation> OrderNewestFirst(
            IQueryable<AiRecommendation> recommendations) =>
            recommendations.OrderByDescending(r => r.Id);
    }
}
