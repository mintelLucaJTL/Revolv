using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevolvAPI.Data;
using RevolvAPI.DTOs;

namespace RevolvAPI.Controllers
{
    // Provides access to the currently logged-in user's own profile (based on the JWT token).
    [ApiController]
    [Route("api/user")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _ctx;

        public UserController(AppDbContext ctx)
        {
            _ctx = ctx;
        }

        // GET: api/user/me
        // Returns the profile (id, email, name) of the currently authenticated user.
        // Name can be null for users that registered before this field existed.
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _ctx.Users.FindAsync(userId.Value);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(new UserDto { Id = user.Id, Email = user.Email, Name = user.Name });
        }

        // PATCH: api/user/me
        // Lets the currently authenticated user set/update their own display name.
        // Used by the "Please tell us your name" popup shown to users that don't have one yet.
        [HttpPatch("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateNameRequest r)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _ctx.Users.FindAsync(userId.Value);
            if (user == null)
            {
                return NotFound();
            }

            user.Name = r.Name.Trim();
            await _ctx.SaveChangesAsync();

            return Ok(new UserDto { Id = user.Id, Email = user.Email, Name = user.Name });
        }

        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe()
        {
            var userId = GetCurrentUserId();

            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _ctx.Users.FindAsync(userId.Value);

            if (user == null)
            {
                return NotFound();
            }

            _ctx.Users.Remove(user);
            await _ctx.SaveChangesAsync();
            return NoContent(); // 204 - User deleted successfully
        }

        // Reads the user id out of the "sub"/NameIdentifier claim that TokenService puts into the JWT.
        private int? GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out var id) ? id : null;
        }
    }
}
