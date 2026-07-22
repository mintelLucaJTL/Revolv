namespace RevolvAPI.DTOs
{
    public class ArticleTableDTO
    {
        public int? id { get; set; }
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Size { get; set; }
        public decimal ReturnRate { get; set; }
        public string? AiStatus { get; set; }
        public string? color { get; set; }
        public string? MostFrequentReason { get; set; }
    }
}