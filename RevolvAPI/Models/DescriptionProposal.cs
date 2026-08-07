using System.ComponentModel.DataAnnotations.Schema;
using RevolvAPI.Services;

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
        public string Status { get; set; } = AiRecommendationStatuses.DescriptionProposalPending;

        // Navigation properties
        public AiRecommendation AiRecommendation { get; set; } = null!;
    }
}
