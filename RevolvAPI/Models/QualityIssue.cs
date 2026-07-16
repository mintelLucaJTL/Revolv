using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    [Table("QualityIssues", Schema = "revolv")]
    public class QualityIssue
    {
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }
        public string? IssueText { get; set; }
        public string? Status { get; set; } = "Ausstehend";

        // Navigation property
        public AiRecommendation AiRecommendation { get; set; } = null!;
    }
}