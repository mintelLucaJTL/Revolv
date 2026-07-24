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
        // Nullable: existing users created before this feature don't have a name yet
        // and are asked to set one via PATCH /api/user/me (see UserController).
        public string? Name { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}