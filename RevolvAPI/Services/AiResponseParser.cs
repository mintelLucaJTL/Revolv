using System.Text.Json;
using System.Text.RegularExpressions;
using RevolvAPI.DTOs;

namespace RevolvAPI.Services
{
    /// <summary>
    /// Pure JSON parsing for AI provider payloads — no HTTP or DB dependencies.
    /// Linked into unit tests without the API host.
    /// </summary>
    public static class AiResponseParser
    {
        private static readonly JsonSerializerOptions DeserializeOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        /// <summary>
        /// Parses raw AI text into <see cref="AiResponseDTO"/>.
        /// Strips optional markdown fences and returns null on empty or invalid JSON.
        /// </summary>
        public static AiResponseDTO? Parse(string? rawAiText)
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
                return null;
            }
        }

        /// <summary>Strips optional markdown fences so Deserialize gets plain JSON.</summary>
        internal static string ExtractJsonPayload(string raw)
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

            // Fallback if the model wrapped JSON in prose
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
