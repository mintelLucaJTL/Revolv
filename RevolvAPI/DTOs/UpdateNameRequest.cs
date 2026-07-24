using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    public class UpdateNameRequest
    {
        [Required(ErrorMessage = "Name is required")]
        [MinLength(1, ErrorMessage = "Name must not be empty")]
        [MaxLength(256, ErrorMessage = "Name must be at most 256 characters long")]
        public string Name { get; set; } = string.Empty;
    }
}
