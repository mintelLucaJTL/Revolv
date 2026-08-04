using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.ReturnLineItems (dbo.tRMRetourePos).
    public class WawiReturnLineItem
    {
        public int Id { get; set; }
        public string? Name { get; set; }

        [Column("SKU")]
        public string? Sku { get; set; }

        public decimal Quantity { get; set; }
        public string? ReasonComment { get; set; }
        public int? ReturnStatusId { get; set; }
        public int? ReturnConditionId { get; set; }
        public int? ItemId { get; set; }
        public int? ReturnId { get; set; }
        public int? ReturnReasonId { get; set; }
    }
}
