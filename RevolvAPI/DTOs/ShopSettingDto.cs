using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    // DTO used by GET/PUT api/settings to transfer the shop-wide AI/return settings.
    public class ShopSettingDto
    {
        [Required]
        [MinLength(1)]
        public string ToneOfVoice { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal ThresholdYellow { get; set; }

        [Range(0, 100)]
        public decimal ThresholdRed { get; set; }

        public bool AutoAnalyzeNewIssues { get; set; }
    }
}
