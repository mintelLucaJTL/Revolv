namespace RevolvAPI.Models.Wawi
{
    // Map to dbo.tArtikelBeschreibung (ShopId = 0 = default name). Read-only except for
    // Beschreibung (Ticket: "KI-Beschreibung in WAWI übernehmen" - see
    // WawiDescriptionPushService), which is the only field this app ever writes back to WAWI.
    public class WawiItemDescription
    {
        public int ArtikelId { get; set; }
        public int SpracheId { get; set; }
        public int PlattformId { get; set; }
        public int ShopId { get; set; }
        public string? Name { get; set; }

        // cBeschreibung - the long product description shown in the shop. Distinct from Name
        // (cName, the product title) - confirmed via schema inspection, do not conflate them.
        public string? Beschreibung { get; set; }
    }
}
