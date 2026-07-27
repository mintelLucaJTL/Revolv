namespace RevolvAPI.DTOs
{
    // Antwortformat der KI-Analyse. IAiService.AnalyzeArticleAsync gibt genau das zurück,
    // damit der Controller es 1:1 in AiRecommendation/DescriptionProposal/ActionRecommendation
    // umwandeln kann (siehe AiRecommendationController.AnalyzeArticle).
    public class AiResponseDTO
    {
        public string SummaryText { get; set; } = string.Empty;
        public string ProposedDescription { get; set; } = string.Empty;
        public List<AiActionRecommendationDTO> ActionRecommendations { get; set; } = new();
    }

    public class AiActionRecommendationDTO
    {
        public string ActionText { get; set; } = string.Empty;
        public string ImpactBadge { get; set; } = string.Empty; // z.B. "-10% Retouren"
        public string Priority { get; set; } = string.Empty;    // "Hoch" | "Mittel" | "Niedrig"
    }
}