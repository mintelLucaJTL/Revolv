namespace RevolvAPI.Services
{
    // Return metrics computed from live JTL-WAWI data (independent of AI recommendations).
    public interface IReturnAnalyticsService
    {
        Task<List<ArticleReturnMetric>> GetArticleReturnMetricsAsync();

        Task<List<ReturnReasonBreakdownItem>> GetReturnReasonBreakdownAsync(int top = 5);

        Task<List<LatestReturnItem>> GetLatestReturnsAsync(int take = 5);

        Task<List<TopReturnedArticle>> GetTopReturnedArticlesAsync(int take = 5);

        // Retourenkosten (Warenwert der zurückgesendeten Artikel, zu Netto-Verkaufspreisen) pro
        // Kalendermonat für die letzten `months` Monate inkl. aktuellem Monat, älteste zuerst.
        Task<List<MonthlyReturnCost>> GetMonthlyReturnCostsAsync(int months);

        Task<Dictionary<int, ArticleDisplayInfo>> GetArticleDisplayInfoAsync(IEnumerable<int> artikelIds);

        // Retourenquote-Trend pro Artikel für die letzten `months` Monate, nur für Artikel mit
        // mindestens einem angenommenen/erledigten KI-Vorschlag (Erfolgsmessung-Feature).
        Task<List<ArticleSuccessTrend>> GetArticleSuccessTrendsAsync(int companyId, int months = 8);
    }
}
