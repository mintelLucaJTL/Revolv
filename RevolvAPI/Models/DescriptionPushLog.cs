using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    // Technical outcome of one push attempt - distinct from the workflow statuses in
    // AiRecommendationStatuses (Ausstehend/Akzeptiert/...), which describe the proposal itself.
    public static class DescriptionPushLogStatuses
    {
        public const string Success = "Success";
        public const string Failed = "Failed";
    }

    // Audit trail for every attempt to push a DescriptionProposal.ProposedText into the live
    // WAWI dbo.tArtikelBeschreibung.cBeschreibung - this is the app's only write path into an
    // otherwise read-only external database, so every attempt (success or failure) is recorded
    // here, including a snapshot of what was overwritten, so a human can manually revert if
    // needed (there is no automated undo).
    [Table("DescriptionPushLog", Schema = "revolv")]
    public class DescriptionPushLog
    {
        public int Id { get; set; }
        public int DescriptionProposalId { get; set; }
        public DescriptionProposal? DescriptionProposal { get; set; }

        // WAWI-Artikel (kArtikel) - kein FK, wie ueberall sonst in diesem Codebase (WAWI/revolv
        // sind getrennte Schemas ohne cross-schema FKs).
        public int ArtikelId { get; set; }

        public DateTime PushedAt { get; set; }
        public int PushedByUserId { get; set; }

        // JSON-Array von { SpracheId, PlattformId, ShopId, PreviousText } - eine Zeile pro
        // ueberschriebener dbo.tArtikelBeschreibung-Zeile, damit ein Mensch die vorherigen
        // Werte im Zweifel manuell wiederherstellen kann.
        public string? PreviousTextSnapshot { get; set; }

        public string NewText { get; set; } = string.Empty;
        public int RowsAffected { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }

        // Snapshot der Retourengruende-Verteilung dieses Artikels zum Zeitpunkt des Pushs -
        // Grundlage fuer die Re-Analyse-Sperre (siehe ReturnAnalyticsService.GetReanalyzeGateAsync):
        // eine neue KI-Analyse lohnt sich erst, wenn sich seit der letzten Ueberarbeitung genug
        // NEUE Retouren angesammelt haben UND sich die Gewichtung der Gruende deutlich verschoben
        // hat. JSON: { "<ReturnReasonId oder \"null\">": <Anzahl>, ... }.
        public string? ReturnReasonSnapshotJson { get; set; }
        public int ReturnLineItemCountAtPush { get; set; }
    }
}
