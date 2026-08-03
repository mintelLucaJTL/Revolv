namespace RevolvAPI.DTOs
{
    public class AiOverviewDTO
    {
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public decimal? ReturnRate { get; set; }

        public bool HasQualityBadge { get; set; }
        public bool HasDescriptionBadge { get; set; }
        public bool HasRecommendationBadge { get; set; }

        public int OpenCount { get; set; }
        public int ResolvedCount { get; set; }
    }
}
