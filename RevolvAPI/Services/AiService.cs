using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
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

        // private readonly fields
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _ctx;

        // constructor
        public AiService(HttpClient httpClient, IConfiguration configuration, AppDbContext ctx)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _ctx = ctx;
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
        public AiResponseDTO? ParseAiResponse(string? rawAiText) // Method to parse the AI response
        {
            // check if the raw AI text is null or whitespace
            if (string.IsNullOrWhiteSpace(rawAiText))
            {
                return null;
            }

            // extract the JSON payload from the raw AI text
            var json = ExtractJsonPayload(rawAiText);

            // try to deserialize the JSON payload into an AiResponseDTO object
            try
            {
                return JsonSerializer.Deserialize<AiResponseDTO>(json, DeserializeOptions);
            }
            // if the JSON payload is invalid, return null
            catch (JsonException)
            {
                // Invalid or truncated AI output must not crash the API.
                return null;
            }
        }

        // method to analyze the article
        public async Task<AiResponseDTO> AnalyzeArticleAsync(
            string articleName,
            string? currentDescription,
            IEnumerable<string> returnReasons)
        {
            // convert the return reasons to a list
            var reasons = returnReasons.ToList();

            // get the shop settings from the database
            var settings = await _ctx.ShopSettings.FirstOrDefaultAsync();
            var toneOfVoice = settings?.ToneOfVoice ?? "Formell und sachlich"; // fallback

            try
            {
                // generate the prompt and pass the tone of voice
                var prompt = BuildAnalysisPrompt(articleName, currentDescription, reasons, toneOfVoice);

                // console output for testing (acceptance criterion)
                Console.WriteLine("====== KI SYSTEM PROMPT (TICKET #172) ======");
                Console.WriteLine(prompt);
                Console.WriteLine("============================================");

                // generate the analysis    
                var raw = await GenerateAnalysisAsync(prompt);

                // parse the AI response
                var parsed = ParseAiResponse(raw);

                // if the AI response is not null, return it
                if (parsed != null)
                {
                    return parsed;
                }
            }
            catch
            {
                // provider not configured / HTTP error -> fallback to static analysis
            }

            // fallback to static analysis (including tone of voice for visual testing in the frontend)
            return BuildStaticAnalysis(articleName, currentDescription, reasons, toneOfVoice);
        }

        // method to generate the analysis
        public async Task<string> GenerateAnalysisAsync(string prompt)
        {
            // get the endpoint, model and API key from the configuration
            var endpoint = _configuration["AiProvider:Endpoint"];
            var model = _configuration["AiProvider:Model"];
            var apiKey = _configuration["AiProvider:ApiKey"];

            // check if the endpoint, model and API key are not null or whitespace
            if (string.IsNullOrWhiteSpace(endpoint) ||
                string.IsNullOrWhiteSpace(model) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                // if the endpoint, model and API key are not null or whitespace, throw an exception
                throw new InvalidOperationException(
                    "KI-Provider nicht vollständig konfiguriert. AiProvider:Endpoint/Model in " +
                    "appsettings.json und AiProvider:ApiKey per 'dotnet user-secrets set' prüfen.");
            }

            // create the request body
            var requestBody = new
            {
                model,
                messages = new[] { new { role = "user", content = prompt } },
            };

            // create the request
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            // send the request
            var response = await _httpClient.SendAsync(request);

            // read the response body
            var responseBody = await response.Content.ReadAsStringAsync();

            // check if the response is not successful
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"OpenRouter-Anfrage fehlgeschlagen ({(int)response.StatusCode}): {responseBody}");
            }

            // parse the response body
            using var doc = JsonDocument.Parse(responseBody);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            // return the content
            return content ?? string.Empty;
        }

        // method to build the analysis prompt
        private string BuildAnalysisPrompt(
            string articleName,
            string? currentDescription,
            IReadOnlyList<string> reasons,
            string toneOfVoice)
        {
            // convert the reasons to a string
            var reasonsText = reasons.Count > 0
                ? string.Join(", ", reasons)
                : "(keine spezifischen Gründe erfasst)";

            // return the prompt
            return $"""
                {MasterPrompt}

                WICHTIG: Schreibe den 'proposedText' (die verbesserte Produktbeschreibung) zwingend in dieser Tonalität: {toneOfVoice}.

                Artikel: {articleName}
                Aktuelle Beschreibung: {currentDescription ?? "(keine)"}
                Retourengründe: {reasonsText}
                """;
        }

        // method to build the static analysis
        private static AiResponseDTO BuildStaticAnalysis(
            string articleName,
            string? currentDescription,
            IReadOnlyList<string> reasons,
            string toneOfVoice)
        {
            // convert the reasons to a string
            var summary = reasons.Count > 0
                ? $"Erhöhte Retourenquote bei \"{articleName}\". Häufigste Gründe: {string.Join(", ", reasons)}. Handlungsbedarf bei Beschreibung und Größenangaben."
                : $"Keine spezifischen Retourengründe für \"{articleName}\" erfasst. Allgemeine Überprüfung der Produktbeschreibung empfohlen.";

            // generate the proposed description based on the tone of voice
            string proposedDescription;
            if (toneOfVoice.Contains("Du", StringComparison.OrdinalIgnoreCase) || toneOfVoice.Contains("Locker", StringComparison.OrdinalIgnoreCase))
            {
                proposedDescription = $"Hey! Hol dir den {articleName}. {(string.IsNullOrWhiteSpace(currentDescription) ? "" : currentDescription)} Passt perfekt und sieht super lässig aus. (Generiert im Fallback-Modus in Tonalität: {toneOfVoice})";
            }
            else
            {
                proposedDescription = $"Entdecken Sie den eleganten {articleName}. {(string.IsNullOrWhiteSpace(currentDescription) ? "" : currentDescription)} Wir empfehlen, die Hinweise zur Passform zu beachten, um höchste Zufriedenheit zu garantieren. (Generiert im Fallback-Modus in Tonalität: {toneOfVoice})";
            }

            // return the static analysis
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
            // trim the raw string
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