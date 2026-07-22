using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    // Shop-wide configuration for the AI tone of voice and the return-rate traffic light thresholds.
    [Table("ShopSettings", Schema = "revolv")]
    public class ShopSetting
    {
        public int Id { get; set; }

        public string ToneOfVoice { get; set; } = "Formell und sachlich";

        // Return rate (%) above which an article is flagged yellow.
        [Precision(5, 2)]
        public decimal ThresholdYellow { get; set; } = 10.0m;

        // Return rate (%) above which an article is flagged red.
        [Precision(5, 2)]
        public decimal ThresholdRed { get; set; } = 25.0m;

        // Whether newly created quality issues should be analyzed by the AI automatically.
        public bool AutoAnalyzeNewIssues { get; set; } = false;
    }
}
