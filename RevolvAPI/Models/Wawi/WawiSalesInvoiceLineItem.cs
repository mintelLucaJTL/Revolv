using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.SalesInvoiceLineItems (Basis: Rechnung.tRechnungPosition).
    // Dient als Nenner der Retourenquote (verkaufte Menge je Artikel).
    public class WawiSalesInvoiceLineItem
    {
        public int Id { get; set; }
        public decimal Quantity { get; set; }

        [Column("SKU")]
        public string? Sku { get; set; }

        public int SalesInvoiceId { get; set; }
        public int? ItemId { get; set; }
    }
}
