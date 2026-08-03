namespace RevolvAPI.DTOs
{
    public class ArticleDTO
    {
        public int Id { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Category { get; set; }
        public decimal? ReturnRate { get; set; }
    }
}
