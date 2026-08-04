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
        private readonly AppDbContext _ctx;
        private readonly ITokenService _tokenService;
        private readonly IPasswordService _passwordService;
        private readonly IEmailService _emailService;

        public AuthController(
            AppDbContext ctx,
            ITokenService tokenService,
            IPasswordService passwordService,
            IEmailService emailService)
        {
            _ctx = ctx;
            _tokenService = tokenService;
            _passwordService = passwordService;
            _emailService = emailService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest r)
        {
            // Include Role so TokenService can put the real role name in the JWT.
            var user = _ctx.Users.Include(u => u.Role).FirstOrDefault(u => u.Email == r.Email);

            if (user == null || !_passwordService.VerifyPassword(r.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid Email or Password");
            }

            var jwt = _tokenService.CreateToken(user);
            return Ok(new { token = jwt });
        }

        [HttpPost("register")]
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
                // Seed data missing (see Database/revolv.Roles.sql) - fail loudly instead of
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

        // One-time helper: re-hash legacy plaintext passwords still stored in the DB.
        [HttpPost("migrate-passwords")]
        public async Task<IActionResult> MigratePasswords()
        {
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
