using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using RevolvAPI.Models;

namespace RevolvAPI.Services
{
    public interface ITokenService
    {
        string CreateToken(User user);
    }

    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }

        public string CreateToken(User user)
        {
            var secretKey = _config["Jwt:Key"];
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Ticket #190: caller must load user with Role included (e.g. .Include(u => u.Role)),
            // otherwise the role claim falls back to "Mitarbeiter" (least privilege).
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role?.RoleName ?? RoleNames.Mitarbeiter),
                new Claim("CompanyId", user.CompanyId.ToString())
            };

            // Optional claim — source of truth for display name is GET /api/user/me
            if (!string.IsNullOrWhiteSpace(user.Name))
            {
                claims = claims.Append(new Claim(ClaimTypes.Name, user.Name)).ToArray();
            }

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
