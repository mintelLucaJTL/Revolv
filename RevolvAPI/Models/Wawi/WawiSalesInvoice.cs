namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.SalesInvoices (Rechnung.tRechnung) - header for WawiSalesInvoiceLineItem.
    // Only the fields needed to date-bucket sales (Erfolgsmessung-Feature) are mapped.
    public class WawiSalesInvoice
    {
        public int Id { get; set; }
        public DateTimeOffset ValueDate { get; set; }
    }
}
