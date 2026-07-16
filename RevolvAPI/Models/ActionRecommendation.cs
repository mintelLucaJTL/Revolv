using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    [Table("ActionRecommendations", Schema = "revolv")]
    public class ActionRecommendation
    {
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }
        public string ActionText { get; set; } = string.Empty; // eg. Check measurement table
        public string ImpactBadge { get; set; } = string.Empty; // eg. -10% Return Rate
        public string Priority { get; set; } = string.Empty; // eg. High, Medium, Low
        public bool IsCompleted { get; set; } = false;

        // Navigation property
        public AiRecommendation? AiRecommendation { get; set; }
    }
}
