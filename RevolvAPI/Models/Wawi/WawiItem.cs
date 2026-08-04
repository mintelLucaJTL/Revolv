namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.Items (dbo.tArtikel).
    public class WawiItem
    {
        public int Id { get; set; }
        public string? Sku { get; set; }
        public bool IsActive { get; set; }
        public int? ProductGroupId { get; set; }
    }
}
