using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace RevolvAPI.Models
{
    [Table("Articles", Schema = "revolv")]
    public class Article
    {
        public int Id { get; set; }
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Size { get; set; }

        // Navigation zu AiRecommendations
        public ICollection<AiRecommendation> AiRecommendations { get; set; } = new List<AiRecommendation>();
    }
}