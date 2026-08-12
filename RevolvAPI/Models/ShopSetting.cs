using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    // Configuration for the AI tone of voice and the return-rate traffic light thresholds -
    // one row per Company (Folge-Ticket zu #190), not a single global row anymore.
    [Table("ShopSettings", Schema = "revolv")]
    public class ShopSetting
    {
        public int Id { get; set; }

        public int CompanyId { get; set; }
        public Company? Company { get; set; }

        public string ToneOfVoice { get; set; } = "Formell und sachlich";

        // Return rate (%) above which an article is flagged yellow.
        [Precision(5, 2)]
        public decimal ThresholdYellow { get; set; } = 10.0m;

        // Return rate (%) above which an article is flagged red.
        [Precision(5, 2)]
        public decimal ThresholdRed { get; set; } = 25.0m;

        // Whether newly created quality issues should be analyzed by the AI automatically.
        public bool AutoAnalyzeNewIssues { get; set; } = false;

        // Re-Analyse-Sperre (siehe ReturnAnalyticsService.GetReanalyzeGateAsync): Mindestanzahl
        // neuer Retouren seit der letzten WAWI-Übernahme, bevor eine erneute KI-Analyse überhaupt
        // in Frage kommt.
        public int MinNewReturnsForReanalyze { get; set; } = 3;

        // Wie stark sich der Anteil (in Prozentpunkten) mindestens EINES Retourengrundes
        // mindestens verschoben haben muss, damit eine neue Analyse als sinnvoll gilt.
        [Precision(5, 2)]
        public decimal SignificantReasonShiftPercentagePoints { get; set; } = 15.0m;
    }
}
