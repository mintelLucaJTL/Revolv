using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    [Table("Articles", Schema = "revolv")]
    public class Article
    {
        public int Id { get; set; }
        public string? ArticleNumber { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public String? Size { get; set; }

    }
}