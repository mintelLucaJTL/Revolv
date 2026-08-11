using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    // Alle Endpunkte hier sind bewusst einzeln mit [AllowAnonymous] markiert (statt der Klasse),
    // damit ein neuer Endpunkt in diesem Controller per Default über die globale
    // Auth-Fallback-Policy geschützt ist und man Anonym-Zugriff explizit anfordern muss.
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private const string RefreshCookieName = "refreshToken";

        private readonly AppDbContext _ctx;
        private readonly ITokenService _tokenService;
        private readonly IPasswordService _passwordService;
        private readonly IRefreshTokenService _refreshTokenService;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _env;

        public AuthController(
            AppDbContext ctx,
            ITokenService tokenService,
            IPasswordService passwordService,
            IRefreshTokenService refreshTokenService,
            IEmailService emailService,
            IWebHostEnvironment env)
        {
            _ctx = ctx;
            _tokenService = tokenService;
            _passwordService = passwordService;
            _refreshTokenService = refreshTokenService;
            _emailService = emailService;
            _env = env;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest r)
        {
            // Include Role so TokenService can put the real role name in the JWT.
            var user = _ctx.Users.Include(u => u.Role).FirstOrDefault(u => u.Email == r.Email);

            if (user == null || !_passwordService.VerifyPassword(r.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid Email or Password");
            }

            // New session: fresh refresh token with its own 2h absolute expiry.
            var refreshToken = await _refreshTokenService.IssueForNewSessionAsync(user.Id);
            SetRefreshCookie(refreshToken.RawToken, refreshToken.AbsoluteExpiresAt);

            var accessToken = _tokenService.CreateAccessToken(user);

            return Ok(new { token = accessToken, sessionExpiresAt = refreshToken.AbsoluteExpiresAt });
        }

        // Rotates the refresh cookie and issues a new access token. No [Authorize]: the access
        // token may already be expired when this is called.
        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh()
        {
            if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) || string.IsNullOrEmpty(rawToken))
            {
                return Unauthorized(new { message = "No refresh token." });
            }

            var result = await _refreshTokenService.RotateAsync(rawToken);

            if (!result.Success || result.User == null || result.NewToken == null)
            {
                DeleteRefreshCookie();
                return Unauthorized(new { message = "Refresh token invalid or expired." });
            }

            SetRefreshCookie(result.NewToken.RawToken, result.NewToken.AbsoluteExpiresAt);

            var accessToken = _tokenService.CreateAccessToken(result.User);

            return Ok(new { token = accessToken, sessionExpiresAt = result.NewToken.AbsoluteExpiresAt });
        }

        // Revokes the current refresh token so it can't be used again.
        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout()
        {
            if (Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) && !string.IsNullOrEmpty(rawToken))
            {
                await _refreshTokenService.RevokeAsync(rawToken);
            }

            DeleteRefreshCookie();
            return Ok();
        }

        private void SetRefreshCookie(string rawToken, DateTime absoluteExpiresAt)
        {
            Response.Cookies.Append(RefreshCookieName, rawToken, BuildCookieOptions(absoluteExpiresAt));
        }

        private void DeleteRefreshCookie()
        {
            Response.Cookies.Delete(RefreshCookieName, BuildCookieOptions(DateTime.UtcNow));
        }

        private CookieOptions BuildCookieOptions(DateTime expiresUtc) => new()
        {
            HttpOnly = true,
            // API runs over plain HTTP locally, so Secure is only required outside Development.
            Secure = !_env.IsDevelopment(),
            SameSite = _env.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.Strict,
            Expires = new DateTimeOffset(DateTime.SpecifyKind(expiresUtc, DateTimeKind.Utc)),
            Path = "/api/auth",
        };

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest r)
        {
            if (await _ctx.Users.AnyAsync(u => u.Email == r.Email))
            {
                return Conflict(new { message = "Diese E-Mail-Adresse wird bereits verwendet." });
            }

            // Ticket #190: the registrant founds their own company and becomes its Admin.
            var adminRoleId = await _ctx.Roles
                .Where(role => role.RoleName == RoleNames.Admin)
                .Select(role => role.Id)
                .FirstOrDefaultAsync();

            if (adminRoleId == 0)
            {
                // Seed data missing (see Database/Scripts/revolv.Roles.sql) - fail loudly instead of
                // silently assigning a bogus RoleId 0.
                return Problem("Rollen sind nicht konfiguriert. Bitte revolv.Roles.sql ausführen.");
            }

            var company = new Company { Name = r.CompanyName.Trim() };
            _ctx.Companies.Add(company);

            var user = new User
            {
                Name = r.Name.Trim(),
                Email = r.Email,
                PasswordHash = _passwordService.HashPassword(r.Password),
                CreatedAt = DateTime.UtcNow,
                Company = company,
                RoleId = adminRoleId
            };

            _ctx.Users.Add(user);

            try
            {
                await _ctx.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Race: another request registered the same email between Any() and SaveChanges;
                // unique index on Email rejects the duplicate.
                return Conflict(new { message = "Diese E-Mail-Adresse wird bereits verwendet." });
            }

            return Ok();
        }

        // One-time helper: re-hash legacy plaintext passwords still stored in the DB. Admin-only
        // and Development-only - this rewrites every user's password hash in the company, so it
        // has no business being reachable (anonymously or otherwise) in production.
        [HttpPost("migrate-passwords")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<IActionResult> MigratePasswords()
        {
            if (!_env.IsDevelopment())
            {
                return NotFound();
            }

            var users = await _ctx.Users
                .Where(u => u.PasswordHash != null && u.PasswordHash != "" && !u.PasswordHash.StartsWith("$2"))
                .ToListAsync();

            foreach (var user in users)
            {
                user.PasswordHash = _passwordService.EnsureHashed(user.PasswordHash);
            }

            await _ctx.SaveChangesAsync();
            return Ok(new { migrated = users.Count });
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest r)
        {
            var user = await _ctx.Users.FirstOrDefaultAsync(u => u.Email == r.Email);

            // Same response whether or not the email exists (prevents email enumeration).
            if (user != null)
            {
                user.PasswordResetToken = Guid.NewGuid().ToString();
                user.ResetTokenExpires = DateTime.UtcNow.AddHours(1);

                await _ctx.SaveChangesAsync();

                var resetLink = $"http://localhost:5173/reset-password?token={user.PasswordResetToken}";
                await _emailService.SendPasswordResetEmailAsync(user.Email, resetLink);
            }

            return Ok(new { message = "Falls ein Account existiert, haben wir einen Reset-Link gesendet." });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest r)
        {
            var user = await _ctx.Users.FirstOrDefaultAsync(u => u.PasswordResetToken == r.Token);

            if (user == null || user.ResetTokenExpires == null || user.ResetTokenExpires < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Der Reset-Link ist ungültig oder abgelaufen." });
            }

            user.PasswordHash = _passwordService.HashPassword(r.NewPassword);
            user.PasswordResetToken = null;
            user.ResetTokenExpires = null;

            await _ctx.SaveChangesAsync();

            return Ok(new { message = "Passwort erfolgreich zurückgesetzt." });
        }
    }
}
