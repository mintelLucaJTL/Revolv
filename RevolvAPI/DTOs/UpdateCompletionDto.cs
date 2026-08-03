using System.ComponentModel.DataAnnotations;


using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    public class UpdateCompletionDto
    {
        [Required]
        public bool IsCompleted { get; set; }
    }
}