namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.ProductGroups (Basis: dbo.tWarengruppe).
    // Wird als "Kategorie" eines Artikels verwendet.
    public class WawiProductGroup
    {
        public int Id { get; set; }
        public string? Name { get; set; }
    }
}
