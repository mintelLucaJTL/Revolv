using System.ComponentModel.DataAnnotations.Schema;
using RevolvAPI.Services;

namespace RevolvAPI.Models
{
    [Table("QualityIssues", Schema = "dbo")]
    public class QualityIssue
    {
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }

        // Ticket #271: Spalte ist in der DB NOT NULL - Model war bisher nullable, obwohl im
        // Code (AI-Analyse, s. ArticleAnalysisService) nie ein null-Text erzeugt wird.
        public string IssueText { get; set; } = string.Empty;

        // Ticket #271: kanonisch AiRecommendationStatuses.QualityIssuePending ("Ausstehend") -
        // die DB hatte hier vorher den abweichenden Default 'Offen' (siehe Migration).
        public string Status { get; set; } = AiRecommendationStatuses.QualityIssuePending;

        // Marks when the automatic-analysis background job (ShopSetting.AutoAnalyzeNewIssues,
        // see AutoAnalysisBackgroundService) claimed/handled this issue. NULL = not yet handled.
        // Doubles as the idempotency key that prevents duplicate automatic analyses for the
        // same issue (e.g. on redelivery after a restart).
        public DateTime? AutoAnalyzedAt { get; set; }

        // Wann Status zuletzt "Erledigt" wurde (Erfolgsmessung-Feature). NULL = nie erledigt.
        public DateTime? ResolvedAt { get; set; }

        // Navigation property
        public AiRecommendation AiRecommendation { get; set; } = null!;
    }
}