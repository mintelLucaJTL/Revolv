using System.Text;
using System.Text.Json;
using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    // AnalyzeArticleAsync erzeugt weiterhin plausible, statische Analyse-Ergebnisse
    // (unverändert von den Teamkollegen übernommen). GenerateAnalysisAsync ruft seit
    // der OpenRouter-Freigabe (Key von Sebastian) echt die KI-API auf.
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

        // Echter Call gegen OpenRouter (OpenAI-kompatible Chat-Completions-API).
        public async Task<string> GenerateAnalysisAsync(string prompt)
        {
            var endpoint = _configuration["AiProvider:Endpoint"];
            var model = _configuration["AiProvider:Model"];
            var apiKey = _configuration["AiProvider:ApiKey"];

            if (string.IsNullOrWhiteSpace(endpoint) ||
                string.IsNullOrWhiteSpace(model) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "KI-Provider nicht vollständig konfiguriert. AiProvider:Endpoint/Model in " +
                    "appsettings.json und AiProvider:ApiKey per 'dotnet user-secrets set' prüfen.");
            }

            var requestBody = new
            {
                model,
                messages = new[] { new { role = "user", content = prompt } },
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"OpenRouter-Anfrage fehlgeschlagen ({(int)response.StatusCode}): {responseBody}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return content ?? string.Empty;
        }
    }
}