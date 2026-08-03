using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RevolvAPI.Data;
using RevolvAPI.DTOs;

namespace RevolvAPI.Controllers
{
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
            return NoContent();
        }

        private int? GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out var id) ? id : null;
        }
    }
}
