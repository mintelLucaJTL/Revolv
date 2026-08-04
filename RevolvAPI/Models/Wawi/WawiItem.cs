namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.Items (dbo.tArtikel).
    public class WawiItem
    {
        public int Id { get; set; }
        public string? Sku { get; set; }
        public bool IsActive { get; set; }
        public int? ProductGroupId { get; set; }

        // Aktueller Katalog-Nettopreis; Fallback für die Retourenkosten-Aggregation, wenn ein
        // Artikel keine SalesInvoiceLineItems hat (siehe ReturnAnalyticsService).
        public decimal SalesPriceNet { get; set; }
    }
}
