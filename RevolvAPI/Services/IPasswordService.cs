// this class functions as an interface for the password service, which is responsible for hashing and verifying passwords. It defines two methods: HashPassword,
// which takes a plain text password and returns a hashed version of it, and VerifyPassword, which takes a plain text password and a hashed password and returns
// a boolean indicating whether the plain text password matches the hashed password.

namespace RevolvAPI.Services
{
    public interface IPasswordService
    {
        // Needed for the registration endpoint
        string HashPassword(string password);

        // Needed for the login endpoint
        bool VerifyPassword(string password, string passwordHash);
    }
}