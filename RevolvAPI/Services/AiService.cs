using System.Text.Json;
using System.Text.RegularExpressions;
using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Defines the master prompt for fashion-return analysis and deserializes
    /// the AI reply into <see cref="AiResponseDTO"/> for EF persistence.
    /// </summary>
    public class AiService : IAiService
    {
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
