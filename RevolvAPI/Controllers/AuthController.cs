using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private const string RefreshCookieName = "refreshToken";

        private readonly AppDbContext _ctx;
        private readonly ITokenService _tokenService;
        private readonly IPasswordService _passwordService;
        private readonly IRefreshTokenService _refreshTokenService;
        private readonly IWebHostEnvironment _env;

        public AuthController(
            AppDbContext ctx,
            ITokenService tokenService,
            IPasswordService passwordService,
            IRefreshTokenService refreshTokenService,
            IWebHostEnvironment env)
        {
            _ctx = ctx;
            _tokenService = tokenService;
            _passwordService = passwordService;
            _refreshTokenService = refreshTokenService;
            _env = env;
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest r)
        {
            // Find the user by email
            var user = _ctx.Users.FirstOrDefault(u => u.Email == r.Email);

            // Check if user exists and verify password
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

        // POST: api/auth/refresh
        // Rotates the refresh cookie and issues a new access token. No [Authorize]: the access
        // token may already be expired when this is called.
        [HttpPost("refresh")]
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

        // POST: api/auth/logout
        // Revokes the current refresh token so it can't be used again.
        [HttpPost("logout")]
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

        private CookieOptions BuildCookieOptions(DateTime expires) => new()
        {
            HttpOnly = true,
            // API runs over plain HTTP locally, so Secure is only required outside Development.
            Secure = !_env.IsDevelopment(),
            SameSite = _env.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.Strict,
            Expires = expires,
            Path = "/api/auth",
        };

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest r)
        {
            // Check if the email already exists
            if (await _ctx.Users.AnyAsync(u => u.Email == r.Email))
            {
                return Conflict(new { message = "Diese E-Mail-Adresse wird bereits verwendet." });
            }

            // Create a new user and hash the password
            var user = new User
            {
                Name = r.Name.Trim(),
                Email = r.Email,
                PasswordHash = _passwordService.HashPassword(r.Password), // hash the password
                CreatedAt = DateTime.UtcNow
            };

            // Save the new user to the database
            _ctx.Users.Add(user);

            try
            {
                await _ctx.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Fängt den Fall ab, dass zwischen der Any()-Prüfung oben und diesem SaveChanges
                // ein zweiter, gleichzeitiger Request dieselbe E-Mail registriert hat - der
                // Unique-Index in AppDbContext schlägt dann hier zu statt einen zweiten Account
                // zuzulassen.
                return Conflict(new { message = "Diese E-Mail-Adresse wird bereits verwendet." });
            }

            return Ok();
        }

        // POST: api/auth/migrate-passwords
        // One-time helper: re-hash legacy plaintext passwords still stored in the DB.
        [HttpPost("migrate-passwords")]
        public async Task<IActionResult> MigratePasswords()
        {
            // Find all users with non-empty passwords that are not already hashed with bcrypt
            var users = await _ctx.Users
                .Where(u => u.PasswordHash != null && u.PasswordHash != "" && !u.PasswordHash.StartsWith("$2"))
                .ToListAsync();

            // Re-hash the passwords for these users
            foreach (var user in users)
            {
                user.PasswordHash = _passwordService.EnsureHashed(user.PasswordHash);
            }

            // Save the changes to the database
            await _ctx.SaveChangesAsync();

            // Return the number of users whose passwords were migrated
            return Ok(new { migrated = users.Count });
        }
    }
}
