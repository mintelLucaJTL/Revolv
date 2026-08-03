namespace RevolvAPI.Services
{
    // Return metrics computed from live JTL-WAWI data (independent of AI recommendations).
    public interface IReturnAnalyticsService
    {
        Task<List<ArticleReturnMetric>> GetArticleReturnMetricsAsync();

        Task<List<ReturnReasonBreakdownItem>> GetReturnReasonBreakdownAsync(int top = 5);

        Task<List<LatestReturnItem>> GetLatestReturnsAsync(int take = 5);

        Task<List<TopReturnedArticle>> GetTopReturnedArticlesAsync(int take = 5);

        Task<Dictionary<int, ArticleDisplayInfo>> GetArticleDisplayInfoAsync(IEnumerable<int> artikelIds);
    }
}
