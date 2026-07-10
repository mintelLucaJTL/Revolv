using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    // we use the Table attribute to specify the table name and schema for the User entity
    [Table("Users", Schema = "revolv")]
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}