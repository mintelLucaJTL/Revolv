using System.Text.Json.Serialization;

namespace RevolvAPI.DTOs
{
    /// <summary>
    /// Strict JSON contract expected from the AI.
    /// Maps onto AiRecommendation / DescriptionProposal / ActionRecommendation for EF persistence.
    /// </summary>
    public class AiResponseDTO
    {
        /// <summary>Maps to AiRecommendation.AiSummaryText.</summary>
        [JsonPropertyName("summary")]
        public string Summary { get; set; } = string.Empty;

        [JsonPropertyName("descriptionProposals")]
        public List<AiDescriptionProposalResponseDto> DescriptionProposals { get; set; } = new();

        [JsonPropertyName("actionRecommendations")]
        public List<AiActionRecommendationResponseDto> ActionRecommendations { get; set; } = new();
    }

    /// <summary>Maps to DescriptionProposal (CurrentText, ProposedText).</summary>
    public class AiDescriptionProposalResponseDto
    {
        [JsonPropertyName("currentText")]
        public string? CurrentText { get; set; }

        [JsonPropertyName("proposedText")]
        public string? ProposedText { get; set; }
    }

    /// <summary>Maps to ActionRecommendation (ActionText, ImpactBadge, Priority).</summary>
    public class AiActionRecommendationResponseDto
    {
        [JsonPropertyName("actionText")]
        public string ActionText { get; set; } = string.Empty;

        [JsonPropertyName("impactBadge")]
        public string ImpactBadge { get; set; } = string.Empty;

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = string.Empty;
    }
}
