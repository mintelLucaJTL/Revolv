namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.ReturnStatuses (Basis: dbo.tRMStatus).
    public class WawiReturnStatus
    {
        public int Id { get; set; }
        public bool IsActive { get; set; }
        public int Position { get; set; }
        public int StatusType { get; set; }
        public int? VisibleMode { get; set; }
        public int? ParentStatusId { get; set; }
    }
}
