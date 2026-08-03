using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations;

namespace RevolvAPI.DTOs
{
    public class UpdateStatusDto
    {
        [Required]
        [MinLength(1)]
        public string Status { get; set; } = string.Empty;
    }

    // DTO for saving an edited AI-proposed description text
    public class UpdateProposalTextDto
    {
        [Required]
        public string ProposedText { get; set; } = string.Empty;
    }
}