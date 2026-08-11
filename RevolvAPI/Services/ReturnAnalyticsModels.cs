namespace RevolvAPI.Services
{
    // Return metrics for one WAWI article (no AI).
    public record ArticleReturnMetric(
        int ArtikelId,
        string Sku,
        string? Name,
        string? Category,
        decimal ReturnedQuantity,
        decimal SoldQuantity,
        decimal ReturnRatePercent,
        string? MostFrequentReason);

    public record ReturnReasonBreakdownItem(
        int ReturnReasonId,
        string ReasonName,
        int Count,
        decimal Percentage);

    // Single return line for the dashboard live feed.
    public record LatestReturnItem(
        int ReturnLineItemId,
        string Sku,
        string? ArticleName,
        string ReasonName,
        DateTimeOffset ReturnDate);

    public record TopReturnedArticle(
        string Sku,
        string? Name,
        decimal ReturnRatePercent);

    // Warenwert der im jeweiligen Kalendermonat zurückgesendeten Artikel (Ticket #273).
    // Monate ohne Retouren sind mit TotalCost=0 enthalten, damit Aufrufer immer eine
    // lückenlose Zeitreihe bekommen (kein Chart mit fehlenden Monaten).
    public record MonthlyReturnCost(
        DateOnly Month,
        decimal TotalCost);

    // Sku/Name/Category for enriching AI rows that only hold ArtikelId.
    public record ArticleDisplayInfo(
        int ArtikelId,
        string Sku,
        string? Name,
        string? Category);

    // Ein Monat der Retourenquote-Zeitreihe für Erfolgsmessung.
    public record MonthlyReturnRatePoint(
        DateOnly Month,
        decimal ReturnRatePercent);

    // Retourenquote-Trend eines Artikels rund um den frühesten angenommenen/erledigten
    // KI-Vorschlag (Erfolgsmessung-Feature). Nur Artikel mit mindestens einer solchen Änderung
    // tauchen hier auf - sonst gäbe es keine sinnvolle vorher/nachher-Grenze.
    public record ArticleSuccessTrend(
        int ArtikelId,
        string Sku,
        string? Name,
        DateOnly ChangeMonth,
        string ChangeLabel,
        List<MonthlyReturnRatePoint> Points);
}
