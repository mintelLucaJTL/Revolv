namespace RevolvAPI.Models.Wawi
{
    // Read-only mapping auf die JTL-WAWI-View DAL.ReturnReasonTranslations (Basis: dbo.tRMGrundSprache).
    // Übersetzter Name/Beschreibung eines Retourengrunds für eine bestimmte Sprache.
    public class WawiReturnReasonTranslation
    {
        public int ReturnReasonId { get; set; }
        public string LanguageId { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
