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

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
        {
            var fromEmail = _config["Smtp:Email"];
            var appPassword = _config["Smtp:AppPassword"];

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Revolv Support", fromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = "Passwort zurücksetzen";
            message.Body = new TextPart("plain")
            {
                Text = $"Hallo,\n\nklicke auf den folgenden Link, um dein Passwort zurückzusetzen (gültig für 1 Stunde):\n\n{resetLink}\n\nFalls du das nicht angefordert hast, ignoriere diese E-Mail.",
            };

            using var client = new SmtpClient();

            try
            {
                // Port 465 = implizites SSL/TLS - laeuft in diesem Netzwerk, 587 (STARTTLS) ist blockiert.
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
