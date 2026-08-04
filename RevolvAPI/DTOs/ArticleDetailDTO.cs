namespace RevolvAPI.DTOs
{
    public class ArticleDetailDTO
    {
        public int Id { get; set; }
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }

        public List<AiRecommendationDetailDTO> AiRecommendations { get; set; } = new();
    }

    public class AiRecommendationDetailDTO
    {
        public int Id { get; set; }
        public decimal? ReturnRate { get; set; }
        public string? AiSummaryText { get; set; }
        public bool IsFullyResolved { get; set; }

        public List<QualityIssueDTO> QualityIssues { get; set; } = new();
        public List<DescriptionProposalDTO> DescriptionProposals { get; set; } = new();
        public List<ActionRecommendationDTO> ActionRecommendations { get; set; } = new();
    }

    public class QualityIssueDTO
    {
        public int Id { get; set; }
        public string? IssueText { get; set; }
        public string? Status { get; set; }
    }

    public class DescriptionProposalDTO
    {
        public int Id { get; set; }
        public string? CurrentText { get; set; }
        public string? ProposedText { get; set; }
        public string? Status { get; set; }
    }

    public class ActionRecommendationDTO
    {
        public int Id { get; set; }
        public string? ActionText { get; set; }
        public string? ImpactBadge { get; set; }
        public string? Priority { get; set; }
        public bool IsCompleted { get; set; }
    }
}
