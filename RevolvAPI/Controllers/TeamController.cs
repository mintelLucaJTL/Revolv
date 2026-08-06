using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Extensions;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    // Team-Verwaltung (Folge-Ticket zu #190): Mitglieder der eigenen Firma sehen, einladen,
    // Rollen vergeben, entfernen. Einladen wiederverwendet den bestehenden
    // PasswordResetToken-Mechanismus (siehe AuthController.ForgotPassword/ResetPassword) statt
    // ein eigenes Invite-Token-System zu bauen - derselbe Link, dieselbe Reset-Password-Seite.
    [ApiController]
    [Authorize]
    [Route("api/team")]
    public class TeamController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IPasswordService _passwordService;
        private readonly IEmailService _emailService;

        public TeamController(AppDbContext ctx, IPasswordService passwordService, IEmailService emailService)
        {
            _ctx = ctx;
            _passwordService = passwordService;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<IActionResult> GetTeam()
        {
            var companyId = User.GetCompanyId();
            var currentUserId = User.GetUserId();

            var members = await _ctx.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.CompanyId == companyId)
                .OrderBy(u => u.CreatedAt)
                .ToListAsync();

            var dtos = members.Select(u => ToDto(u, currentUserId)).ToList();

            return Ok(dtos);
        }

        // Nur Admins dürfen einladen/Rollen ändern/entfernen - [Authorize(Roles=...)] greift
        // automatisch auf den Role-Claim zu, den TokenService.CreateAccessToken schon setzt.
        [HttpPost("invite")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<IActionResult> InviteTeamMember([FromBody] InviteTeamMemberRequest r)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (r.RoleName != RoleNames.Admin && r.RoleName != RoleNames.Mitarbeiter)
            {
                return BadRequest("RoleName muss 'Admin' oder 'Mitarbeiter' sein.");
            }

            if (await _ctx.Users.AnyAsync(u => u.Email == r.Email))
            {
                return Conflict(new { message = "Diese E-Mail-Adresse wird bereits verwendet." });
            }

            var roleId = await _ctx.Roles
                .Where(role => role.RoleName == r.RoleName)
                .Select(role => role.Id)
                .FirstOrDefaultAsync();

            if (roleId == 0)
            {
                return Problem("Rollen sind nicht konfiguriert. Bitte revolv.Roles.sql ausführen.");
            }

            var companyId = User.GetCompanyId();
            var company = await _ctx.Companies.FindAsync(companyId);

            var invitedUser = new User
            {
                Email = r.Email,
                // Unbekanntes, nie kommuniziertes Passwort - Login geht erst, nachdem über den
                // Einladungslink (PasswordResetToken) ein eigenes Passwort gesetzt wurde.
                PasswordHash = _passwordService.HashPassword(Guid.NewGuid().ToString()),
                CreatedAt = DateTime.UtcNow,
                CompanyId = companyId,
                RoleId = roleId,
                PasswordResetToken = Guid.NewGuid().ToString(),
                ResetTokenExpires = DateTime.UtcNow.AddDays(7),
            };

            _ctx.Users.Add(invitedUser);

            try
            {
                await _ctx.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Race: gleiche E-Mail zwischen Any() und SaveChanges registriert.
                return Conflict(new { message = "Diese E-Mail-Adresse wird bereits verwendet." });
            }

            var inviteLink = $"http://localhost:5173/reset-password?token={invitedUser.PasswordResetToken}";

            try
            {
                await _emailService.SendTeamInviteEmailAsync(r.Email, company?.Name ?? "Revolv", inviteLink);
            }
            catch (Exception ex)
            {
                // Einladung bleibt gespeichert, auch wenn der Mailversand scheitert (z. B. SMTP
                // down) - sonst wäre der Invite komplett verloren statt dass der Admin den Link
                // notfalls manuell weitergeben kann.
                Console.WriteLine($"[TeamController] Einladungs-Mail an {r.Email} fehlgeschlagen: {ex.Message}");
            }

            return Ok(ToDto(invitedUser, User.GetUserId(), r.RoleName));
        }

        [HttpPatch("{userId}/role")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<IActionResult> UpdateRole(int userId, [FromBody] UpdateTeamMemberRoleRequest r)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (r.RoleName != RoleNames.Admin && r.RoleName != RoleNames.Mitarbeiter)
            {
                return BadRequest("RoleName muss 'Admin' oder 'Mitarbeiter' sein.");
            }

            var companyId = User.GetCompanyId();
            var target = await _ctx.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId && u.CompanyId == companyId);

            if (target == null) return NotFound();

            if (target.Role?.RoleName == RoleNames.Admin
                && r.RoleName != RoleNames.Admin
                && await IsLastAdminAsync(companyId, target.Id))
            {
                return BadRequest("Es muss mindestens ein Admin in der Firma verbleiben.");
            }

            var roleId = await _ctx.Roles
                .Where(role => role.RoleName == r.RoleName)
                .Select(role => role.Id)
                .FirstOrDefaultAsync();

            target.RoleId = roleId;
            await _ctx.SaveChangesAsync();

            return Ok(ToDto(target, User.GetUserId(), r.RoleName));
        }

        [HttpDelete("{userId}")]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<IActionResult> RemoveTeamMember(int userId)
        {
            var companyId = User.GetCompanyId();
            var currentUserId = User.GetUserId();

            if (userId == currentUserId)
            {
                return BadRequest("Du kannst dich nicht selbst aus dem Team entfernen.");
            }

            var target = await _ctx.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId && u.CompanyId == companyId);

            if (target == null) return NotFound();

            if (target.Role?.RoleName == RoleNames.Admin && await IsLastAdminAsync(companyId, target.Id))
            {
                return BadRequest("Es muss mindestens ein Admin in der Firma verbleiben.");
            }

            _ctx.Users.Remove(target);
            await _ctx.SaveChangesAsync();

            return NoContent();
        }

        private async Task<bool> IsLastAdminAsync(int companyId, int excludingUserId)
        {
            var adminRoleId = await _ctx.Roles
                .Where(r => r.RoleName == RoleNames.Admin)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            var otherAdmins = await _ctx.Users
                .CountAsync(u => u.CompanyId == companyId && u.RoleId == adminRoleId && u.Id != excludingUserId);

            return otherAdmins == 0;
        }

        private static TeamMemberDto ToDto(User user, int currentUserId, string? roleNameOverride = null) =>
            new TeamMemberDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                RoleName = roleNameOverride ?? user.Role?.RoleName ?? RoleNames.Mitarbeiter,
                CreatedAt = user.CreatedAt,
                IsCurrentUser = user.Id == currentUserId,
            };
    }
}
