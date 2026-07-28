namespace RevolvAPI.DTOs
{
    /// <summary>
    /// Strukturiertes Ergebnis von <see cref="RevolvAPI.Services.IAiService.AnalyzeArticleAsync"/>,
    /// bereit zur Persistierung als AiRecommendation / DescriptionProposal / ActionRecommendation.
    /// </summary>
    public class AiAnalysisResult
    {
        public string SummaryText { get; set; } = string.Empty;

        public string? ProposedDescription { get; set; }

        public List<AiActionRecommendationResponseDto> ActionRecommendations { get; set; } = new();
    }
}
