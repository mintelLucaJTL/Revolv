using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    // Raw token value for the caller to put in the HttpOnly cookie - never persisted.
    public record IssuedRefreshToken(string RawToken, Guid SessionId, DateTime AbsoluteExpiresAt);

    public record RefreshTokenRotationResult(bool Success, User? User, IssuedRefreshToken? NewToken, string? FailureReason);

    public interface IRefreshTokenService
    {
        // Starts a new session on login (fresh SessionId and absolute expiry).
        Task<IssuedRefreshToken> IssueForNewSessionAsync(int userId);

        // Validates and rotates a refresh token: old one is revoked, new one keeps the same session.
        Task<RefreshTokenRotationResult> RotateAsync(string rawToken);

        // Revokes a refresh token (logout). No-op if unknown.
        Task RevokeAsync(string rawToken);
    }

    public class RefreshTokenService : IRefreshTokenService
    {
        private readonly AppDbContext _ctx;
        private readonly IConfiguration _config;

        private const int DefaultAbsoluteSessionHours = 2;

        public RefreshTokenService(AppDbContext ctx, IConfiguration config)
        {
            _ctx = ctx;
            _config = config;
        }

        private TimeSpan AbsoluteSessionLength =>
            TimeSpan.FromHours(_config.GetValue<double?>("Jwt:AbsoluteSessionHours") ?? DefaultAbsoluteSessionHours);

        public async Task<IssuedRefreshToken> IssueForNewSessionAsync(int userId)
        {
            var now = DateTime.UtcNow;
            var sessionId = Guid.NewGuid();
            var absoluteExpiresAt = now + AbsoluteSessionLength;

            var (issued, _) = await IssueInternalAsync(userId, sessionId, absoluteExpiresAt, now);
            return issued;
        }

        public async Task<RefreshTokenRotationResult> RotateAsync(string rawToken)
        {
            var hash = Hash(rawToken);
            var existing = await _ctx.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == hash);

            if (existing == null)
            {
                return new RefreshTokenRotationResult(false, null, null, "invalid");
            }

            // Reusing an already-rotated/revoked token looks like theft - kill the whole session.
            if (existing.RevokedAt != null)
            {
                await RevokeSessionAsync(existing.SessionId);
                return new RefreshTokenRotationResult(false, null, null, "reused");
            }

            var now = DateTime.UtcNow;

            if (now >= existing.AbsoluteExpiresAt)
            {
                return new RefreshTokenRotationResult(false, null, null, "session_expired");
            }

            // Include Role so CreateAccessToken can emit the real role claim (Ticket #190).
            var user = await _ctx.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == existing.UserId);
            if (user == null)
            {
                await RevokeSessionAsync(existing.SessionId);
                return new RefreshTokenRotationResult(false, null, null, "invalid");
            }

            var (newToken, newEntityId) = await IssueInternalAsync(existing.UserId, existing.SessionId, existing.AbsoluteExpiresAt, now);

            existing.RevokedAt = now;
            existing.ReplacedByTokenId = newEntityId;
            await _ctx.SaveChangesAsync();

            return new RefreshTokenRotationResult(true, user, newToken, null);
        }

        public async Task RevokeAsync(string rawToken)
        {
            var hash = Hash(rawToken);
            var existing = await _ctx.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == hash);

            if (existing == null)
            {
                return;
            }

            // Logout ends the whole login session, not just the current rotated token.
            await RevokeSessionAsync(existing.SessionId);
        }

        private async Task RevokeSessionAsync(Guid sessionId)
        {
            var now = DateTime.UtcNow;
            var tokens = await _ctx.RefreshTokens
                .Where(rt => rt.SessionId == sessionId && rt.RevokedAt == null)
                .ToListAsync();

            foreach (var token in tokens)
            {
                token.RevokedAt = now;
            }

            await _ctx.SaveChangesAsync();
        }

        private async Task<(IssuedRefreshToken Issued, Guid EntityId)> IssueInternalAsync(int userId, Guid sessionId, DateTime absoluteExpiresAt, DateTime now)
        {
            var raw = GenerateRawToken();

            var entity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TokenHash = Hash(raw),
                SessionId = sessionId,
                SessionStartedAt = absoluteExpiresAt - AbsoluteSessionLength,
                AbsoluteExpiresAt = absoluteExpiresAt,
                CreatedAt = now,
            };

            _ctx.RefreshTokens.Add(entity);
            await _ctx.SaveChangesAsync();

            return (new IssuedRefreshToken(raw, sessionId, absoluteExpiresAt), entity.Id);
        }

        private static string GenerateRawToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(32); // 256 bit
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
        }

        private static string Hash(string rawToken)
        {
            var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken));
            return Convert.ToHexString(bytes);
        }
    }
}
