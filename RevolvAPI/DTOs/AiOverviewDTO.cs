namespace RevolvAPI.DTOs
{
    // Overview of an article's AI workload: core article data, which badges the
    // client must render, and the progress of the associated AI tasks.
    public class AiOverviewDTO
    {
        // Core article data
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Size { get; set; }
        public decimal? ReturnRate { get; set; }

        // Badge flags computed on the server
        public bool HasQualityBadge { get; set; }
        public bool HasDescriptionBadge { get; set; }
        public bool HasRecommendationBadge { get; set; }

        // Progress counters for the AI tasks
        public int OpenCount { get; set; }
        public int ResolvedCount { get; set; }
    }
}
