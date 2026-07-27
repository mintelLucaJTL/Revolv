using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    public interface IAiService
    {
        /// <summary>System/master prompt that forces the AI into the AiResponseDTO JSON shape.</summary>
        string MasterPrompt { get; }

        /// <summary>
        /// Parses raw AI text into <see cref="AiResponseDTO"/>.
        /// Strips optional markdown fences and deserializes without throwing on empty input.
        /// </summary>
        AiResponseDTO? ParseAiResponse(string? rawAiText);
    }
}
