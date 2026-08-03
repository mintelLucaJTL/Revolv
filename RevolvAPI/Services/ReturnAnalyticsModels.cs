namespace RevolvAPI.Services
{
    // Retourenkennzahlen für einen einzelnen WAWI-Artikel, komplett ohne KI-Bezug berechnet.
    public record ArticleReturnMetric(
        int ArtikelId,
        string Sku,
        string? Name,
        string? Category,
        decimal ReturnedQuantity,
        decimal SoldQuantity,
        decimal ReturnRatePercent,
        string? MostFrequentReason);

    // Anteil eines einzelnen Retourengrunds an allen Retourenpositionen.
    public record ReturnReasonBreakdownItem(
        int ReturnReasonId,
        string ReasonName,
        int Count,
        decimal Percentage);

    // Eine einzelne, zeitlich sortierte Retourenposition für das Live-Feed auf dem Dashboard.
    public record LatestReturnItem(
        int ReturnLineItemId,
        string Sku,
        string? ArticleName,
        string ReasonName,
        DateTimeOffset ReturnDate);

    // Artikel mit der höchsten Retourenquote, für die Top-Liste auf dem Dashboard.
    public record TopReturnedArticle(
        string Sku,
        string? Name,
        decimal ReturnRatePercent);

    // Schlanke Artikel-Anzeigedaten (Sku/Name/Kategorie), z.B. um AiRecommendation/QualityIssue-
    // Zeilen (die nur eine ArtikelId halten, aber kein Navigation-Property mehr auf den Artikel
    // haben) für die Anzeige mit den echten WAWI-Stammdaten anzureichern.
    public record ArticleDisplayInfo(
        int ArtikelId,
        string Sku,
        string? Name,
        string? Category);
}
