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

        // KI-aufbereitete Kundenkommentare (grammatikalisch bereinigt, aus Retourengründen und
        // rohen Freitext-Kommentaren erzeugt) - als JSON-Array-String persistiert, da es kein
        // eigenes Read-Modell dafür braucht (siehe QualityIssues/ActionRecommendations für
        // Beispiele mit eigener Tabelle, hier bewusst schlanker).
        public string? GeneratedCustomerCommentsJson { get; set; }

        // Folge-Ticket zu #190: welche Firma diese Analyse gehört - Controller filtern
        // darauf, damit Firma A keine Empfehlungen/Qualitätsprobleme von Firma B sieht.
        public int CompanyId { get; set; }
        public Company? Company { get; set; }

        // Navigation properties
        public ICollection<DescriptionProposal> DescriptionProposals { get; set; } = new List<DescriptionProposal>();
        public ICollection<QualityIssue> QualityIssues { get; set; } = new List<QualityIssue>();
        public ICollection<ActionRecommendation> ActionRecommendations { get; set; } = new List<ActionRecommendation>();
    }
}