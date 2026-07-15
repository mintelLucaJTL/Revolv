using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    [Table("DescriptionProposals", Schema = "revolv")]
    public class DescriptionProposal
    {
        // Properties
        public int Id { get; set; }
        public int AiRecommendationId { get; set; }
        public string? CurrentText { get; set; }
        public string? ProposedText { get; set; }
        public string Status { get; set; } = "Ausstehend";

        // Navigation properties
        public AiRecommendation AiRecommendation { get; set; } = null!;
    }
}
