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

        // articleName + aktuelle Beschreibung + Retourengründe als Klartext rein,
        // strukturierte KI-Analyse raus.
        Task<AiResponseDTO> AnalyzeArticleAsync(
            string articleName,
            string? currentDescription,
            IEnumerable<string> returnReasons);

        // Prompt rein, rohe Text-Antwort raus (OpenRouter Chat-Completions).
        Task<string> GenerateAnalysisAsync(string prompt);
    }
}
