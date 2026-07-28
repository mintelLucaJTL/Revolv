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
        // Bereits per DI verdrahtet (siehe Program.cs: AddHttpClient<IAiService, AiService>()),
        // damit für GenerateAnalysisAsync später nur noch der echte HTTP-Call ergänzt werden muss,
        // sobald ein Anbieter/Budget feststeht.
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

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

            var actions = new List<AiActionRecommendationResponseDto>
            {
                new() { ActionText = "Größentabelle prüfen und aktualisieren", ImpactBadge = "-10% Retouren", Priority = "Hoch" },
                new() { ActionText = "Materialangaben in Beschreibung ergänzen", ImpactBadge = "-6% Retouren", Priority = "Mittel" },
                new() { ActionText = "Produktfotos auf Konsistenz prüfen", ImpactBadge = "-4% Retouren", Priority = "Niedrig" },
            };

            var result = new AiResponseDTO
            {
                Summary = summary,
                DescriptionProposals = new List<AiDescriptionProposalResponseDto>
                {
                    new() { CurrentText = currentDescription, ProposedText = proposedDescription },
                },
                ActionRecommendations = actions,
            };

            return Task.FromResult(result);
        }

        // Fake-Implementierung wie AnalyzeArticleAsync: kein echter HTTP-Call, kostet nichts.
        // Sobald ein Anbieter/Budget freigegeben ist, hier den echten _httpClient-Call gegen
        // AiProvider:Endpoint (appsettings.json) mit AiProvider:ApiKey (User Secrets) einbauen.
        public Task<string> GenerateAnalysisAsync(string prompt)
        {
            var fakeReply =
                $"[Platzhalter-Antwort, keine echte KI-Anbindung] Prompt erhalten ({prompt.Length} Zeichen).";

            return Task.FromResult(fakeReply);
        }
    }
}