using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace RevolvAPI.Models
{
    [Table("AiRecommendations", Schema = "revolv")]
    public class AiRecommendation
    {
        public int Id { get; set; }

        // Zeigt logisch auf den echten WAWI-Artikel (dbo.tArtikel.kArtikel / DAL.Items.Id).
        // Bewusst kein Navigation-Property und keine FK-Constraint: der Artikel lebt im
        // WAWI-Schema, nicht im revolv-Schema - Artikeldaten werden bei Bedarf per Join
        // gegen WawiItem/WawiItemDescription nachgeladen (siehe ReturnAnalyticsService).
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