using System.Text.Json;
using System.Text.RegularExpressions;
using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Kommuniziert mit dem externen KI-Anbieter, um Artikel-Retouren zu analysieren, und
    /// deserialisiert die KI-Antwort in ein <see cref="AiResponseDTO"/> zur Persistierung via EF.
    /// HINWEIS: Welcher Anbieter (OpenAI / Azure OpenAI / etc.) genutzt wird, steht noch nicht fest
    /// (wartet auf Freigabe der IT-Abteilung) — <see cref="GenerateAnalysisAsync"/> ist bis dahin
    /// nur ein Platzhalter.
    /// </summary>
    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        private static readonly JsonSerializerOptions DeserializeOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

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

        /// <inheritdoc />
        /// <remarks>
        /// PLATZHALTER: Der KI-Anbieter steht noch nicht fest (wartet auf Freigabe der IT-Abteilung).
        /// _httpClient und _configuration sind bereits per DI verdrahtet (siehe Program.cs:
        /// AddHttpClient&lt;IAiService, AiService&gt;() und AiProvider:* in appsettings.json), damit hier
        /// nur noch der eigentliche HTTP-Call für den gewählten Anbieter ergänzt werden muss, sobald
        /// Endpoint/Auth-Schema (Bearer-Token, api-key-Header, Query-Param, ...) feststehen.
        /// </remarks>
        public Task<string> GenerateAnalysisAsync(string prompt)
        {
            var endpoint = _configuration["AiProvider:Endpoint"];
            var apiKey = _configuration["AiProvider:ApiKey"];

            if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "Es ist noch kein KI-Provider angebunden (wartet auf Freigabe der IT-Abteilung). " +
                    "Sobald ein Anbieter feststeht: AiProvider:Endpoint in appsettings.json setzen, " +
                    "AiProvider:ApiKey per 'dotnet user-secrets set AiProvider:ApiKey <key>' hinterlegen " +
                    "(niemals in appsettings.json / Git!) und den HTTP-Call in " +
                    "AiService.GenerateAnalysisAsync implementieren.");
            }

            // TODO: sobald der Provider feststeht, hier den echten HTTP-Call über _httpClient bauen.
            throw new NotImplementedException(
                "AiProvider ist konfiguriert, aber der HTTP-Call wurde noch nicht implementiert.");
        }

        /// <inheritdoc />
        public async Task<AiAnalysisResult> AnalyzeArticleAsync(
            string articleName, string? currentDescription, List<string> returnReasons)
        {
            var reasonsBlock = returnReasons.Count > 0
                ? string.Join("\n", returnReasons.Select(r => $"- {r}"))
                : "- Keine dokumentierten Retourengründe";

            var prompt = $"""
                {MasterPrompt}

                Artikel: {articleName}
                Aktuelle Produktbeschreibung: {currentDescription ?? "Keine Beschreibung vorhanden"}
                Retourengründe:
                {reasonsBlock}
                """;

            var rawResponse = await GenerateAnalysisAsync(prompt);
            var parsed = ParseAiResponse(rawResponse);

            if (parsed == null)
            {
                return new AiAnalysisResult
                {
                    SummaryText = "Die KI-Antwort konnte nicht verarbeitet werden.",
                    ProposedDescription = currentDescription,
                    ActionRecommendations = new(),
                };
            }

            return new AiAnalysisResult
            {
                SummaryText = parsed.Summary,
                ProposedDescription = parsed.DescriptionProposals.FirstOrDefault()?.ProposedText ?? currentDescription,
                ActionRecommendations = parsed.ActionRecommendations,
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
