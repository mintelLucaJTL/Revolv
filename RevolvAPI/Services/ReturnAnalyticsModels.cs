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

    // Sku/Name/Category for enriching AI rows that only hold ArtikelId.
    public record ArticleDisplayInfo(
        int ArtikelId,
        string Sku,
        string? Name,
        string? Category);
}
