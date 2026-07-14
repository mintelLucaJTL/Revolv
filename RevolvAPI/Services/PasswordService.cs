namespace RevolvAPI.Services
{
    public class PasswordService : IPasswordService
    {
        // Hash the provided password using bcrypt
        public string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        // Verify the provided password against the stored hash
        public bool VerifyPassword(string password, string passwordHash)
        {
            if (IsBcryptHash(passwordHash))
            {
                return BCrypt.Net.BCrypt.Verify(password, passwordHash);
            }

            // Fallback for legacy plaintext entries until migration is complete.
            return password == passwordHash;
        }

        // Check if the provided hash is a valid bcrypt hash
        public bool IsBcryptHash(string passwordHash)
        {
            return !string.IsNullOrEmpty(passwordHash) && passwordHash.StartsWith("$2");
        }

        // Ensure that the provided string is a bcrypt hash. If it's not, hash it.
        public string EnsureHashed(string passwordOrHash)
        {
            if (IsBcryptHash(passwordOrHash))
            {
                return passwordOrHash;
            }

            return HashPassword(passwordOrHash);
        }
    }
}
