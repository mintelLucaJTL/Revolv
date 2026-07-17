using System.ComponentModel.DataAnnotations;


using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    // DTO für das Setzen von IsCompleted (ActionRecommendation)
    public class UpdateCompletionDto
    {
        [Required]
        public bool IsCompleted { get; set; }
    }
}