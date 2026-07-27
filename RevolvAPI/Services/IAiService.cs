using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    public interface IAiService
    {
        // articleName + aktuelle Beschreibung + Retourengründe als Klartext rein,
        // strukturierte KI-Analyse raus.
        Task<AiResponseDTO> AnalyzeArticleAsync(
            string articleName,
            string? currentDescription,
            IEnumerable<string> returnReasons);
    }
}