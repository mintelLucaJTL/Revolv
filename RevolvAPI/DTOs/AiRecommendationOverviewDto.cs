namespace RevolvAPI.DTOs
{
    public class AiRecommendationOverviewDto
    {
        public int Id { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Size { get; set; } = string.Empty;
        public string ReturnRate { get; set; } = "low";
        public bool HasQualityBadge { get; set; }
        public bool HasDescriptionBadge { get; set; }
        public bool HasRecommendationBadge { get; set; }
        public int OpenCount { get; set; }
        public int ResolvedCount { get; set; }
    }
}
