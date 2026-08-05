namespace RevolvAPI.Services
{
    /// <summary>
    /// Allowed ToneOfVoice values for shop settings and AI prompts.
    /// Free-text tones are rejected to limit prompt injection via settings.
    /// </summary>
    public static class ToneOfVoiceOptions
    {
        public const string Default = "Formell und sachlich";

        public static readonly IReadOnlyList<string> Allowed =
        [
            "Locker",
            Default,
        ];

        public static bool IsAllowed(string? tone) =>
            !string.IsNullOrWhiteSpace(tone) &&
            Allowed.Any(a => string.Equals(a, tone.Trim(), StringComparison.Ordinal));

        /// <summary>Returns a known tone, or <see cref="Default"/> if the value is unknown.</summary>
        public static string Normalize(string? tone)
        {
            if (string.IsNullOrWhiteSpace(tone))
            {
                return Default;
            }

            var trimmed = tone.Trim();
            var match = Allowed.FirstOrDefault(a =>
                string.Equals(a, trimmed, StringComparison.Ordinal));

            return match ?? Default;
        }
    }
}
