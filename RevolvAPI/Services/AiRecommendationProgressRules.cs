namespace RevolvAPI.Services
{
    /// <summary>
    /// Canonical status strings for AI review items. Keep in sync with
    /// Frontend/src/utils/qualityReviewProgress.ts.
    /// </summary>
    public static class AiRecommendationStatuses
    {
        public const string QualityIssueResolved = "Erledigt";
        public const string QualityIssuePending = "Ausstehend";

        public const string DescriptionProposalAccepted = "Akzeptiert";
        public const string DescriptionProposalRejected = "Abgelehnt";
        public const string DescriptionProposalPending = "Ausstehend";

        public static readonly IReadOnlyCollection<string> QualityIssueValues =
            [QualityIssueResolved, QualityIssuePending];

        public static readonly IReadOnlyCollection<string> DescriptionProposalValues =
            [DescriptionProposalAccepted, DescriptionProposalRejected, DescriptionProposalPending];
    }

    // Ticket #271: die pro-Artikel "Sammel-Status"-Badge in der Retourenanalyse-Tabelle
    // (GET /api/articles/returns) - ein eigener Werteraum, abgeleitet aus den
    // AiRecommendationStatuses-Werten der zugehörigen DescriptionProposals, nicht deren
    // 1:1-Abbild. Muss mit Frontend/src/types/api.ts AIStatus übereinstimmen.
    public static class ArticleAiStatuses
    {
        public const string NoRecommendation = "Keine Empfehlung";
        public const string Pending = "Ausstehend";
        public const string Accepted = "Angenommen";
        public const string Rejected = "Abgelehnt";
        public const string Resolved = "Gelöst";
    }

    public readonly record struct AiRecommendationProgressCounts(int OpenCount, int ResolvedCount)
    {
        public int TotalCount => OpenCount + ResolvedCount;

        /// <summary>
        /// True when every review item is completed and at least one item exists.
        /// </summary>
        public bool IsFullyResolved => OpenCount == 0 && ResolvedCount > 0;
    }

    /// <summary>
    /// Pure open/resolved counting shared by overview, modal progress, and dashboard KPIs.
    /// Linked into unit tests without the API host.
    /// </summary>
    public static class AiRecommendationProgressRules
    {
        public static bool IsQualityIssueResolved(string? status) =>
            status == AiRecommendationStatuses.QualityIssueResolved;

        public static bool IsDescriptionProposalCompleted(string? status) =>
            status is AiRecommendationStatuses.DescriptionProposalAccepted
                or AiRecommendationStatuses.DescriptionProposalRejected;

        public static AiRecommendationProgressCounts Count(
            IEnumerable<string?> qualityIssueStatuses,
            IEnumerable<string?> descriptionProposalStatuses,
            IEnumerable<bool> actionIsCompletedFlags)
        {
            var quality = qualityIssueStatuses as ICollection<string?> ?? qualityIssueStatuses.ToList();
            var proposals = descriptionProposalStatuses as ICollection<string?> ?? descriptionProposalStatuses.ToList();
            var actions = actionIsCompletedFlags as ICollection<bool> ?? actionIsCompletedFlags.ToList();

            var resolvedQuality = quality.Count(IsQualityIssueResolved);
            var resolvedProposals = proposals.Count(IsDescriptionProposalCompleted);
            var resolvedActions = actions.Count(completed => completed);

            var total = quality.Count + proposals.Count + actions.Count;
            var resolved = resolvedQuality + resolvedProposals + resolvedActions;

            return new AiRecommendationProgressCounts(total - resolved, resolved);
        }

        /// <summary>
        /// One active (newest) recommendation id per article — historical analyses are collapsed.
        /// Newest = highest recommendation id (IDENTITY creation order; descending).
        /// </summary>
        public static IReadOnlyList<(int ArticleId, int RecommendationId)> SelectLatestPerArticle(
            IEnumerable<(int ArticleId, int RecommendationId)> recommendations) =>
            recommendations
                .GroupBy(r => r.ArticleId)
                .Select(g => g.OrderByDescending(r => r.RecommendationId).First())
                .ToList();

        /// <summary>
        /// Canonical sort for active/newest-first lists: highest recommendation id first
        /// (IDENTITY correlates with creation time).
        /// </summary>
        public static IOrderedEnumerable<(int ArticleId, int RecommendationId)> OrderNewestFirst(
            IEnumerable<(int ArticleId, int RecommendationId)> recommendations) =>
            recommendations.OrderByDescending(r => r.RecommendationId);
    }
}
