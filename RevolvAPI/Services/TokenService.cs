using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    // Interface for the token service, defining a method to create a JWT token for a user
    public interface ITokenService
    {
        string CreateToken(User user);
    }

    // Implementation of the token service, responsible for creating JWT tokens
    public class TokenService : ITokenService
    {
        // Configuration object to access application settings, such as the JWT secret key and issuer
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }

        // Create a JWT token for the given user
        public string CreateToken(User user)
        {
            // Create claims based on the user information
            var secretKey = _config["Jwt:Key"];
            // Create a symmetric security key using the secret key
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            // Create signing credentials using the security key and the HMAC-SHA256 algorithm
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Create claims for the JWT token, claims are pieces of information about the user that will be included in the token
            var claims = new[]
            {
                // Include the user's ID 
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                // Include the user's email address
                new Claim(ClaimTypes.Email, user.Email),
                // Include the user's role, in this case, we are assigning a default role of "User"
                new Claim(ClaimTypes.Role, "User")
            };

            // Create the JWT token with the specified issuer, audience, claims, expiration time, and signing credentials
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Issuer"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(120),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
