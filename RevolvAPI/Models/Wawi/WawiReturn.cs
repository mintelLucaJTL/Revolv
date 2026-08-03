namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.Returns (Basis: dbo.tRMRetoure) - der Kopf einer Retoure.
    public class WawiReturn
    {
        public int Id { get; set; }
        public string? Number { get; set; }
        public DateTimeOffset ReturnDate { get; set; }
        public int ReturnStateId { get; set; }
        public int? CustomerId { get; set; }
        public int? SalesOrderId { get; set; }
        public int? WarehouseId { get; set; }
        public int? CompanyId { get; set; }
    }
}
