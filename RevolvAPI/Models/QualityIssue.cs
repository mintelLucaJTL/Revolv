using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    [Table("QualityIssues", Schema = "dbo")]
    public class QualityIssue
    {
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }
        public string? IssueText { get; set; }
        public string? Status { get; set; } = "Ausstehend";

        // Marks when the automatic-analysis background job (ShopSetting.AutoAnalyzeNewIssues,
        // see AutoAnalysisBackgroundService) claimed/handled this issue. NULL = not yet handled.
        // Doubles as the idempotency key that prevents duplicate automatic analyses for the
        // same issue (e.g. on redelivery after a restart).
        public DateTime? AutoAnalyzedAt { get; set; }

        // Navigation property
        public AiRecommendation AiRecommendation { get; set; } = null!;
    }
}