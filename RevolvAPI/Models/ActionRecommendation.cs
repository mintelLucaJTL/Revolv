using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    [Table("ActionRecommendations", Schema = "revolv")]
    public class ActionRecommendation
    {
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }
        public string ActionText { get; set; } = string.Empty; // eg. Check measurement table

        // Ticket #271: DB erlaubt hier NULL (KI liefert nicht immer beides) - Model verlangte
        // bisher fälschlich einen nicht-nullbaren String.
        public string? ImpactBadge { get; set; } // eg. -10% Return Rate
        public string? Priority { get; set; } // eg. Hoch, Mittel, Niedrig (von der KI vergeben)
        public bool IsCompleted { get; set; } = false;

        // Wann IsCompleted zuletzt auf true gesetzt wurde (Erfolgsmessung-Feature). NULL = nie abgeschlossen.
        public DateTime? CompletedAt { get; set; }

        // Navigation property
        public AiRecommendation? AiRecommendation { get; set; }
    }
}
