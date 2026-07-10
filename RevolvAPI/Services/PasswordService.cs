namespace RevolvAPI.Services
{
    public class PasswordService : IPasswordService
    {
        // method to hash a password
        public string HashPassword(string password)
        {
            // Temporary dummy: Returns the password as is, without hashing
            return password;
        }

        // method to verify a password against a hashed password
        public bool VerifyPassword(string password, string passwordHash)
        {
            // Returns true if the password matches the hashed password, false otherwise
            // return BCrypt.Net.BCrypt.Verify(password, passwordHash);
            return password == passwordHash;
        }
    }
}