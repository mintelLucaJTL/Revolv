using System.ComponentModel.DataAnnotations.Schema;
using RevolvAPI.Services;

namespace RevolvAPI.Models
{
    [Table("DescriptionProposals", Schema = "revolv")]
    public class DescriptionProposal
    {
        // Properties
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }
        public string? CurrentText { get; set; }
        public string? ProposedText { get; set; }
        public string Status { get; set; } = AiRecommendationStatuses.DescriptionProposalPending;

        // Wann Status zuletzt "Akzeptiert" wurde (Erfolgsmessung-Feature). NULL = nie akzeptiert.
        public DateTime? AcceptedAt { get; set; }

        // Wann dieser Vorschlag in die live WAWI-Artikelbeschreibung übernommen wurde (siehe
        // WawiDescriptionPushService). NULL = noch nicht übernommen; dient als Idempotenz-
        // Schlüssel, damit ein Klick auf "In WAWI übernehmen" nie zweimal schreibt.
        public DateTime? PushedToWawiAt { get; set; }

        // Navigation properties
        public AiRecommendation AiRecommendation { get; set; } = null!;
    }
}
