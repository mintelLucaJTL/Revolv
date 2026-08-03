namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf dbo.tArtikelBeschreibung. Enthält den Artikelnamen/die
    // Beschreibung je Sprache/Plattform/Shop. Für den (shop-unabhängigen) Standardnamen
    // wird die Zeile mit ShopId = 0 verwendet (siehe DAL.ItemPlatformDescriptions).
    public class WawiItemDescription
    {
        public int ArtikelId { get; set; }
        public int SpracheId { get; set; }
        public int PlattformId { get; set; }
        public int ShopId { get; set; }
        public string? Name { get; set; }
    }
}
