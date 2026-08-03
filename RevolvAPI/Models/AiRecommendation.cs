using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace RevolvAPI.Models
{
    [Table("AiRecommendations", Schema = "revolv")]
    public class AiRecommendation
    {
        public int Id { get; set; }

        // Logical ref to WAWI dbo.tArtikel.kArtikel (no FK across schemas)
        public int ArtikelId { get; set; }
        public string? AiSummaryText { get; set; }
        [Precision(5, 2)]
        public decimal? ReturnRate { get; set; }
        public bool IsFullyResolved { get; set; }

        // Navigation properties
        public ICollection<DescriptionProposal> DescriptionProposals { get; set; } = new List<DescriptionProposal>();
        public ICollection<QualityIssue> QualityIssues { get; set; } = new List<QualityIssue>();
        public ICollection<ActionRecommendation> ActionRecommendations { get; set; } = new List<ActionRecommendation>();
    }
}