using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace RevolvAPI.Models
{
    [Table("AiRecommendations", Schema = "revolv")]
    public class AiRecommendation
    {
        // Properties
        public int Id { get; set; }
        public int ArticleId { get; set; }
        public string? AiSummaryText { get; set; }
        [Precision(5, 2)] // 5 digits, 2 decimals, eg. 123.45
        public decimal? ReturnRate { get; set; }
        public bool IsFullyResolved { get; set; }

        // Navigation properties
        public Article Article { get; set; } = null!;
        public ICollection<DescriptionProposal> DescriptionProposals { get; set; } = [];
        public ICollection<QualityIssue> QualityIssues { get; set; } = [];
    }
}
