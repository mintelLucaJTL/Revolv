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
        /// Sendet einen Prompt an den konfigurierten KI-Anbieter und liefert die rohe Text-Antwort zurück.
        /// </summary>
        Task<string> GenerateAnalysisAsync(string prompt);

        /// <summary>
        /// Baut den Analyse-Prompt für einen einzelnen Artikel, ruft <see cref="GenerateAnalysisAsync"/>
        /// auf und parsed das Ergebnis in ein strukturiertes <see cref="AiAnalysisResult"/>.
        /// </summary>
        Task<AiAnalysisResult> AnalyzeArticleAsync(string articleName, string? currentDescription, List<string> returnReasons);
    }
}
