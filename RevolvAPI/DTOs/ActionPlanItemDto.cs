namespace RevolvAPI.DTOs
{
    public class ActionPlanItemDto
    {
        public int ArticleId { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal ReturnRatePercent { get; set; }
        public decimal EstimatedReturnCost { get; set; }
        public int OpenItemCount { get; set; }
        public string NextStepText { get; set; } = string.Empty;
        public int RecommendationId { get; set; }
    }
}
