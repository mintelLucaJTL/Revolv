using BCrypt.Net;
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
            // Get the user from the database by email
            var user = _ctx.Users.FirstOrDefault(u => u.Email == r.Email);

            // If the user is not found or the password does not match, return Unauthorized
            if (user == null || !_passwordService.VerifyPassword(r.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid Email or Password");
            }

            // Generate a JWT token for the authenticated user
            var jwt = _tokenService.CreateToken(user);

            // Return the token in the response
            return Ok(new { token = jwt });
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest r)
        {
            if (_ctx.Users.Any(u => u.Email == r.Email))
            {
                return BadRequest("Email already exists");
            }

            // Create a new user entity
            var user = new User
            {
                Email = r.Email,
                // Hash the password before storing it
                PasswordHash = _passwordService.HashPassword(r.Password),
                CreatedAt = DateTime.UtcNow
            };

            // Add the user to the database
            _ctx.Users.Add(user);
            _ctx.SaveChanges();

            return Ok();
        }

        // Einzelner Benutzer
        public async Task<bool> PasswordHash(int userId)
        {
            var user = await _ctx.Users.FindAsync(userId);
            if (user == null) return false;

            if (!string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("$2"))
            {
                user.PasswordHash = _passwordService.HashPassword(user.PasswordHash);
                await _ctx.SaveChangesAsync();
                return true;
            }

            return false;
        }

        // Endpoint: migriert alle noch nicht-gehashten PasswordHash-Einträge
        [HttpPost("migrate-passwords")]
        public async Task<IActionResult> MigratePasswords()
        {
            var users = await _ctx.Users
                .Where(u => !string.IsNullOrEmpty(u.PasswordHash) && !u.PasswordHash.StartsWith("$2"))// das ein BCrypt hash immer mit $2 beginnt wird hier geschaut ob schon gehasht wurde
                .ToListAsync();

            foreach (var user in users)
            {
                user.PasswordHash = _passwordService.HashPassword(user.PasswordHash);
            }

            await _ctx.SaveChangesAsync();
            return Ok(new { migrated = users.Count });
        }
    }
}