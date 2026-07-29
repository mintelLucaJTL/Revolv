using System.ComponentModel.DataAnnotations.Schema;

namespace RevolvAPI.Models
{
    // One issued refresh token. Only the SHA-256 hash is stored, never the raw value.
    [Table("RefreshTokens", Schema = "revolv")]
    public class RefreshToken
    {
        public Guid Id { get; set; }

        public int UserId { get; set; }

        public string TokenHash { get; set; } = string.Empty;

        // Shared by all tokens produced by rotating within the same login session.
        public Guid SessionId { get; set; }

        // Set once at login, never changed by rotation.
        public DateTime SessionStartedAt { get; set; }

        // Hard session limit (SessionStartedAt + 2h). Rotation never extends this.
        public DateTime AbsoluteExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? RevokedAt { get; set; }

        // The token that replaced this one after rotation.
        public Guid? ReplacedByTokenId { get; set; }

        public bool IsActive => RevokedAt == null && DateTime.UtcNow < AbsoluteExpiresAt;
    }
}
