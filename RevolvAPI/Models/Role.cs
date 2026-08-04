using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    // Fixed reference table (Admin, Mitarbeiter) - rows are seeded by SQL, not managed via API.
    public static class RoleNames
    {
        public const string Admin = "Admin";
        public const string Mitarbeiter = "Mitarbeiter";
    }

    [Table("Roles", Schema = "revolv")]
    public class Role
    {
        public int Id { get; set; }
        public string RoleName { get; set; } = string.Empty;
    }
}
