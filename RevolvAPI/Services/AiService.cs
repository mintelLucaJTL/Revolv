using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    // Fake-Implementierung ohne echten OpenAI-Call - kostet nichts.
    // Erzeugt plausible, aber statische Analyse-Ergebnisse auf Basis der Eingaben,
    // damit der komplette Flow (Endpoint -> DB) getestet werden kann, ohne API-Kosten.
    // Sobald ein echtes Budget/API-Key vorhanden ist, kann diese Klasse 1:1 durch eine
    // Implementierung ersetzt werden, die wirklich die OpenAI-API aufruft - das Interface
    // IAiService bleibt dabei unverändert.
    public class AiService : IAiService
    {
        public Task<AiResponseDTO> AnalyzeArticleAsync(
            string articleName,
            string? currentDescription,
            IEnumerable<string> returnReasons)
        {
            var reasons = returnReasons.ToList();

            var summary = reasons.Any()
                ? $"Erhöhte Retourenquote bei \"{articleName}\". Häufigste Gründe: {string.Join(", ", reasons)}. Handlungsbedarf bei Beschreibung und Größenangaben."
                : $"Keine spezifischen Retourengründe für \"{articleName}\" erfasst. Allgemeine Überprüfung der Produktbeschreibung empfohlen.";

            var proposedDescription = string.IsNullOrWhiteSpace(currentDescription)
                ? $"{articleName} - überarbeitete Beschreibung mit klaren Angaben zu Passform, Material und Pflegehinweisen (Platzhalter, KI-Anbindung noch nicht aktiv)."
                : $"{currentDescription.Trim()} Ergänzung: klare Hinweise zu Passform und Größe, um Fehlkäufe zu vermeiden (Platzhalter, KI-Anbindung noch nicht aktiv).";

            var actions = new List<AiActionRecommendationDTO>
            {
                new() { ActionText = "Größentabelle prüfen und aktualisieren", ImpactBadge = "-10% Retouren", Priority = "Hoch" },
                new() { ActionText = "Materialangaben in Beschreibung ergänzen", ImpactBadge = "-6% Retouren", Priority = "Mittel" },
                new() { ActionText = "Produktfotos auf Konsistenz prüfen", ImpactBadge = "-4% Retouren", Priority = "Niedrig" },
            };

            var result = new AiResponseDTO
            {
                SummaryText = summary,
                ProposedDescription = proposedDescription,
                ActionRecommendations = actions,
            };

            return Task.FromResult(result);
        }
    }
}
