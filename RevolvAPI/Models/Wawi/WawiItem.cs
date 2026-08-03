namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.Items (Basis: dbo.tArtikel).
    // Wird nie beschrieben - die WAWI ist die Quelle der Wahrheit für Artikel-Stammdaten.
    public class WawiItem
    {
        public int Id { get; set; }
        public string? Sku { get; set; }
        public bool IsActive { get; set; }
        public int? ProductGroupId { get; set; }
    }
}
