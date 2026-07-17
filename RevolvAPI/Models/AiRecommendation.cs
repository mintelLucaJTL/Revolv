using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace RevolvAPI.Models
{
    [Table("AiRecommendations", Schema = "revolv")]
    public class AiRecommendation
    {
        public int Id { get; set; }
        public int ArticleId { get; set; }
        public string? AiSummaryText { get; set; }
        [Precision(5, 2)]
        public decimal? ReturnRate { get; set; }
        public bool IsFullyResolved { get; set; }

        // Navigation properties
        public Article Article { get; set; } = null!;
        public ICollection<DescriptionProposal> DescriptionProposals { get; set; } = new List<DescriptionProposal>();
        public ICollection<QualityIssue> QualityIssues { get; set; } = new List<QualityIssue>();
        public ICollection<ActionRecommendation> ActionRecommendations { get; set; } = new List<ActionRecommendation>();
    }
}