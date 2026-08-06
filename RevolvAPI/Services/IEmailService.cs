namespace RevolvAPI.Services
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string toEmail, string resetLink);

        Task SendTeamInviteEmailAsync(string toEmail, string companyName, string inviteLink);
    }
}