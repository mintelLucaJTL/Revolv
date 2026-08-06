using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace RevolvAPI.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public Task SendPasswordResetEmailAsync(string toEmail, string resetLink) =>
            SendAsync(
                toEmail,
                "Passwort zurücksetzen",
                $"Hallo,\n\nklicke auf den folgenden Link, um dein Passwort zurückzusetzen (gültig für 1 Stunde):\n\n{resetLink}\n\nFalls du das nicht angefordert hast, ignoriere diese E-Mail.");

        public Task SendTeamInviteEmailAsync(string toEmail, string companyName, string inviteLink) =>
            SendAsync(
                toEmail,
                $"Einladung zu {companyName} auf Revolv",
                $"Hallo,\n\ndu wurdest eingeladen, dem Team \"{companyName}\" auf Revolv beizutreten.\n\nKlicke auf den folgenden Link, um dein Passwort festzulegen und loszulegen (gültig für 7 Tage):\n\n{inviteLink}\n\nFalls du das nicht erwartet hast, ignoriere diese E-Mail.");

        private async Task SendAsync(string toEmail, string subject, string bodyText)
        {
            var fromEmail = _config["Smtp:Email"];
            var appPassword = _config["Smtp:AppPassword"];

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Revolv Support", fromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = bodyText };

            using var client = new SmtpClient();

            try
            {
                // Port 465 = implicit SSL/TLS (587 STARTTLS is blocked on this network).
                await client.ConnectAsync("smtp.gmail.com", 465, SecureSocketOptions.SslOnConnect);
                await client.AuthenticateAsync(fromEmail, appPassword);
                await client.SendAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] Fehler beim Versand: {ex.Message}");
                Console.WriteLine($"[EmailService] Inner Exception: {ex.InnerException?.Message}");
                throw;
            }
            finally
            {
                await client.DisconnectAsync(true);
            }
        }
    }
}
