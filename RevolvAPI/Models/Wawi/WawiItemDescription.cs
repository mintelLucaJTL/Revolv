namespace RevolvAPI.Models.Wawi
{
    // Read-only map to dbo.tArtikelBeschreibung (ShopId = 0 = default name).
    public class WawiItemDescription
    {
        public int ArtikelId { get; set; }
        public int SpracheId { get; set; }
        public int PlattformId { get; set; }
        public int ShopId { get; set; }
        public string? Name { get; set; }
    }
}
