namespace RevolvAPI.DTOs
{
    public class DashboardKpiDto
    {
        public decimal? wholeReturnQuote { get; set; } = 0.0m;
        public int? affectedArticle { get; set; } = 0;
        public int? openKiRecommendations { get; set; } = 0;
        public int? improvedProducts { get; set; } = 0;
    }
}
