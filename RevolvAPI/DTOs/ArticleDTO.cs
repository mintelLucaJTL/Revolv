namespace RevolvAPI.DTOs
{
    public class ArticleDTO
    {
        public int Id { get; set; }
        public string ArticleNumber { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string Size { get; set; }
        public string ArtColor { get; set; }
        public decimal? ReturnRate { get; set; }
    }
}
