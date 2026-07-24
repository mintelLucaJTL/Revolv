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

        public AuthController(AppDbContext ctx, ITokenService tokenService, IPasswordService passwordService)
        {
            _ctx = ctx;
            _tokenService = tokenService;
            _passwordService = passwordService;
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest r)
        {
            // Find the user by email
            var user = _ctx.Users.FirstOrDefault(u => u.Email == r.Email);

            // Check if user exists and verify password
            if (user == null || !_passwordService.VerifyPassword(r.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid Email or Password");
            }

            // Generate JWT token
            var jwt = _tokenService.CreateToken(user);

            // Return the token to the client
            return Ok(new { token = jwt });
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest r)
        {
            // Check if the email already exists
            if (_ctx.Users.Any(u => u.Email == r.Email))
            {
                return BadRequest("Email already exists");
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
            _ctx.SaveChanges();

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
