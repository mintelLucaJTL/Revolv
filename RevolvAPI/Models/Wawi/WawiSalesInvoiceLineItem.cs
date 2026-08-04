using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.SalesInvoiceLineItems (Rechnung.tRechnungPosition).
    public class WawiSalesInvoiceLineItem
    {
        public int Id { get; set; }
        public decimal Quantity { get; set; }

        [Column("SKU")]
        public string? Sku { get; set; }

        // Tatsächlich in Rechnung gestellter Netto-Einzelpreis (nicht der aktuelle Katalogpreis).
        public decimal SalesPriceNet { get; set; }

        public int SalesInvoiceId { get; set; }
        public int? ItemId { get; set; }
    }
}
