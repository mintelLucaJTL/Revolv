using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Entity-aware wrappers around <see cref="AiRecommendationProgressRules"/>.
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
                .Select(g => g.OrderByDescending(r => r.Id).First());
    }
}
