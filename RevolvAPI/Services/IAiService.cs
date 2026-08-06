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

        /// <summary>
        /// Article name + description + return reasons in; structured AI analysis out.
        /// Returns null when the provider responded with empty or invalid content (Ticket #242).
        /// </summary>
        Task<AiResponseDTO?> AnalyzeArticleAsync(
            string articleName,
            string? currentDescription,
            IEnumerable<string> returnReasons);

        // User prompt (+ optional system prompt) in, raw text out (OpenRouter chat completions).
        Task<string> GenerateAnalysisAsync(string userPrompt, string? systemPrompt = null);
    }
}
