namespace RevolvAPI.Models.Wawi
{
    // Read-only map to DAL.ReturnReasonTranslations (dbo.tRMGrundSprache).
    public class WawiReturnReasonTranslation
    {
        public int ReturnReasonId { get; set; }
        public string LanguageId { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
