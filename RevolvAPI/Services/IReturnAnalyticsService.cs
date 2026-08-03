namespace RevolvAPI.Services
{
    // Zentrale Stelle für alle Retouren-Berechnungen direkt auf Basis der echten JTL-WAWI-Daten.
    // Bewusst unabhängig von AiRecommendation/QualityIssue: die Retouren-Analyse muss auch
    // funktionieren, wenn nie eine KI-Analyse gelaufen ist.
    public interface IReturnAnalyticsService
    {
        // Liefert für jeden aktiven WAWI-Artikel die retournierte Menge, die verkaufte Menge
        // (aus Rechnungspositionen) und die daraus berechnete Retourenquote in Prozent.
        Task<List<ArticleReturnMetric>> GetArticleReturnMetricsAsync();

        // Liefert die häufigsten Retourengründe (Anzahl + prozentualer Anteil an allen
        // Retourenpositionen), absteigend sortiert.
        Task<List<ReturnReasonBreakdownItem>> GetReturnReasonBreakdownAsync(int top = 5);

        // Liefert die zuletzt erfassten Retourenpositionen (neueste zuerst).
        Task<List<LatestReturnItem>> GetLatestReturnsAsync(int take = 5);

        // Liefert die Artikel mit der höchsten Retourenquote (nur Artikel mit mind. einer Retoure).
        Task<List<TopReturnedArticle>> GetTopReturnedArticlesAsync(int take = 5);

        // Löst eine Menge von ArtikelIds zu ihren WAWI-Anzeigedaten (Sku/Name/Kategorie) auf.
        // Wird von AI-/Quality-Controllern genutzt, um Zeilen anzureichern, die nur eine
        // ArtikelId (kein Navigation-Property) halten.
        Task<Dictionary<int, ArticleDisplayInfo>> GetArticleDisplayInfoAsync(IEnumerable<int> artikelIds);
    }
}
