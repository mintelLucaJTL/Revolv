namespace RevolvAPI.Services
{
    public interface IPasswordService
    {
        string HashPassword(string password);

        bool VerifyPassword(string password, string passwordHash);

        bool IsBcryptHash(string passwordHash);

        string EnsureHashed(string passwordOrHash);
    }
}
