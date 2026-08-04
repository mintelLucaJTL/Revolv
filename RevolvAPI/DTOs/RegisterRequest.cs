using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Name is required")]
        public string Name { get; set; } = string.Empty;
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email address")]
        public string Email { get; set; } = string.Empty;
        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters long")]
        public string Password { get; set; } = string.Empty;

        // Ticket #190: the registrant founds their own company and becomes its Admin.
        // Joining an existing company happens via invite (see Team-UI follow-up ticket), not here.
        [Required(ErrorMessage = "Company name is required")]
        public string CompanyName { get; set; } = string.Empty;
    }
}
