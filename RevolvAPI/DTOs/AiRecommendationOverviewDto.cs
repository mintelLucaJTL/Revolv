namespace RevolvAPI.DTOs
{
    /// <summary>
    /// KI-Hub overview card for one article's active (newest) recommendation.
    /// <see cref="ArticleId"/> is the WAWI article key used by GET /api/articles/{id}.
    /// <see cref="RecommendationId"/> is the revolv.AiRecommendations primary key.
    /// These ID spaces must never be mixed.
    /// </summary>
    public class AiRecommendationOverviewDto
    {
        /// <summary>WAWI article id (dbo.tArtikel.kArtikel). Use for detail fetches and UI keys.</summary>
        public int ArticleId { get; set; }

        /// <summary>Active AiRecommendation row id for this article (newest analysis).</summary>
        public int RecommendationId { get; set; }

        public string ArticleNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ReturnRate { get; set; } = "none";
        public bool HasQualityBadge { get; set; }
        public bool HasDescriptionBadge { get; set; }
        public bool HasRecommendationBadge { get; set; }
        public int OpenCount { get; set; }
        public int ResolvedCount { get; set; }
    }
}
