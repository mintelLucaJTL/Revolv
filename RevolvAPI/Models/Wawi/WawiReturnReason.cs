namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.ReturnReasons (Basis: dbo.tRMGrund).
    // Der Name/Beschreibung steckt nicht hier, sondern in WawiReturnReasonTranslation.
    public class WawiReturnReason
    {
        public int Id { get; set; }
        public string? Color { get; set; }
        public bool IsActive { get; set; }
    }
}
