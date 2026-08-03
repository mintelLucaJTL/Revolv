namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.ReturnReasons (dbo.tRMGrund).
    public class WawiReturnReason
    {
        public int Id { get; set; }
        public string? Color { get; set; }
        public bool IsActive { get; set; }
    }
}
