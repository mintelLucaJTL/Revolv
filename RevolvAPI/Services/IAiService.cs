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

        // Platzhalter für den direkten KI-Aufruf: Prompt rein, rohe Text-Antwort raus.
        // Solange kein Anbieter/Budget freigegeben ist (wartet auf IT), liefert die
        // Implementierung eine statische Fake-Antwort statt eines echten HTTP-Calls.
        Task<string> GenerateAnalysisAsync(string prompt);
    }
}
