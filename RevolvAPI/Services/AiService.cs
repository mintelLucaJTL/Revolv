using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Master-Prompt + JSON-Parsing (AiResponseDTO) sowie OpenRouter-HTTP-Call.
    /// AnalyzeArticleAsync nutzt die echte KI, fällt bei Fehlern auf eine statische Analyse zurück.
    /// </summary>
    public class AiService : IAiService
    {
        private static readonly JsonSerializerOptions DeserializeOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        /// <inheritdoc />
        public string MasterPrompt =>
            """
            Du bist ein Mode-Analyst. Analysiere folgende Retourendaten.
            Antworte AUSSCHLIESSLICH in folgendem JSON-Format (kein Markdown, kein erklärender Text außerhalb des JSON):

            {
              "summary": "Kurze Analyse der Retourenursachen",
              "descriptionProposals": [
                {
                  "currentText": "Aktuelle Produktbeschreibung",
                  "proposedText": "Verbesserte Produktbeschreibung"
                }
              ],
              "actionRecommendations": [
                {
                  "actionText": "Konkrete Handlungsempfehlung",
                  "impactBadge": "z.B. -10% Retouren",
                  "priority": "High|Medium|Low"
                }
              ]
            }

            Regeln:
            - Antworte nur mit gültigem JSON, das exakt diese Struktur hat.
            - descriptionProposals und actionRecommendations sind Arrays (können leer sein []).
            - priority darf nur High, Medium oder Low sein.
            - Keine zusätzlichen Felder.
            """;

        /// <inheritdoc />
        public AiResponseDTO? ParseAiResponse(string? rawAiText)
        {
            if (string.IsNullOrWhiteSpace(rawAiText))
            {
                return null;
            }

            var json = ExtractJsonPayload(rawAiText);

            try
            {
                return JsonSerializer.Deserialize<AiResponseDTO>(json, DeserializeOptions);
            }
            catch (JsonException)
            {
                // Invalid or truncated AI output must not crash the API.
                return null;
            }
        }

        public async Task<AiResponseDTO> AnalyzeArticleAsync(
            string articleName,
            string? currentDescription,
            IEnumerable<string> returnReasons)
        {
            var reasons = returnReasons.ToList();

            try
            {
                var prompt = BuildAnalysisPrompt(articleName, currentDescription, reasons);
                var raw = await GenerateAnalysisAsync(prompt);
                var parsed = ParseAiResponse(raw);
                if (parsed != null)
                {
                    return parsed;
                }
            }
            catch
            {
                // Provider nicht konfiguriert / HTTP-Fehler → Fallback auf statische Analyse.
            }

            return BuildStaticAnalysis(articleName, currentDescription, reasons);
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

        private string BuildAnalysisPrompt(
            string articleName,
            string? currentDescription,
            IReadOnlyList<string> reasons)
        {
            var reasonsText = reasons.Count > 0
                ? string.Join(", ", reasons)
                : "(keine spezifischen Gründe erfasst)";

            return $"""
                {MasterPrompt}

                Artikel: {articleName}
                Aktuelle Beschreibung: {currentDescription ?? "(keine)"}
                Retourengründe: {reasonsText}
                """;
        }

        private static AiResponseDTO BuildStaticAnalysis(
            string articleName,
            string? currentDescription,
            IReadOnlyList<string> reasons)
        {
            var summary = reasons.Count > 0
                ? $"Erhöhte Retourenquote bei \"{articleName}\". Häufigste Gründe: {string.Join(", ", reasons)}. Handlungsbedarf bei Beschreibung und Größenangaben."
                : $"Keine spezifischen Retourengründe für \"{articleName}\" erfasst. Allgemeine Überprüfung der Produktbeschreibung empfohlen.";

            var proposedDescription = string.IsNullOrWhiteSpace(currentDescription)
                ? $"{articleName} - überarbeitete Beschreibung mit klaren Angaben zu Passform, Material und Pflegehinweisen (Platzhalter, KI-Anbindung noch nicht aktiv)."
                : $"{currentDescription.Trim()} Ergänzung: klare Hinweise zu Passform und Größe, um Fehlkäufe zu vermeiden (Platzhalter, KI-Anbindung noch nicht aktiv).";

            return new AiResponseDTO
            {
                Summary = summary,
                DescriptionProposals = new List<AiDescriptionProposalResponseDto>
                {
                    new() { CurrentText = currentDescription, ProposedText = proposedDescription },
                },
                ActionRecommendations = new List<AiActionRecommendationResponseDto>
                {
                    new() { ActionText = "Größentabelle prüfen und aktualisieren", ImpactBadge = "-10% Retouren", Priority = "Hoch" },
                    new() { ActionText = "Materialangaben in Beschreibung ergänzen", ImpactBadge = "-6% Retouren", Priority = "Mittel" },
                    new() { ActionText = "Produktfotos auf Konsistenz prüfen", ImpactBadge = "-4% Retouren", Priority = "Niedrig" },
                },
            };
        }

        /// <summary>
        /// Removes optional ```json ... ``` fences so Deserialize gets plain JSON.
        /// </summary>
        private static string ExtractJsonPayload(string raw)
        {
            var trimmed = raw.Trim();

            var fenceMatch = Regex.Match(
                trimmed,
                @"^```(?:json)?\s*(.*?)\s*```$",
                RegexOptions.Singleline | RegexOptions.IgnoreCase);

            if (fenceMatch.Success)
            {
                return fenceMatch.Groups[1].Value.Trim();
            }

            // Fallback: first { ... } block if the model added prose around the JSON.
            var start = trimmed.IndexOf('{');
            var end = trimmed.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                return trimmed[start..(end + 1)];
            }

            return trimmed;
        }
    }
}
