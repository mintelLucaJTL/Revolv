using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    public class TeamMemberDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsCurrentUser { get; set; }
    }

    public class InviteTeamMemberRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string RoleName { get; set; } = string.Empty;
    }

    public class UpdateTeamMemberRoleRequest
    {
        [Required]
        public string RoleName { get; set; } = string.Empty;
    }
}
