using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Shared "is this AI result worth persisting / showing" rules.
    /// Keep in sync with Frontend <c>isUsableAiRecommendation</c>.
    /// </summary>
    public static class AiRecommendationContentRules
    {
        /// <summary>
        /// True when the parsed AI payload has at least one visible piece of content
        /// (summary, description proposal, or action). Empty shells must not be saved as success.
        /// </summary>
        public static bool IsUsable(AiResponseDTO? response)
        {
            if (response == null)
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(response.Summary))
            {
                return true;
            }

            if (response.DescriptionProposals.Any(p => !string.IsNullOrWhiteSpace(p.ProposedText)))
            {
                return true;
            }

            if (response.ActionRecommendations.Any(a => !string.IsNullOrWhiteSpace(a.ActionText)))
            {
                return true;
            }

            return false;
        }
    }
}
