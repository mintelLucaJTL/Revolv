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

        // Priorisierte To-Do-Liste offener KI-Empfehlungen, sortiert nach geschätztem
        // Einsparpotenzial (Retourenmenge × Verkaufspreis) - für die Aktionsplan-Seite.
        Task<List<ActionPlanItem>> GetActionPlanAsync(int companyId);

        // Re-Analyse-Sperre: ob eine neue KI-Analyse für diesen Artikel aktuell sinnvoll ist,
        // basierend auf neuen Retouren und einer verschobenen Retourengrund-Gewichtung seit der
        // letzten live in WAWI übernommenen Beschreibung.
        Task<ReanalyzeGate> GetReanalyzeGateAsync(int articleId, int companyId);

        // Retourenquote-Trend pro Artikel für die letzten `months` Monate, nur für Artikel mit
        // mindestens einem angenommenen/erledigten KI-Vorschlag (Erfolgsmessung-Feature).
        Task<List<ArticleSuccessTrend>> GetArticleSuccessTrendsAsync(int companyId, int months = 8);
    }
}
