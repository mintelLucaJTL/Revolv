using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Extensions;
using RevolvAPI.Models;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{
    // Speist die Glocke in TopNavigationBar - bewusst ohne eigene "Notifications"-Tabelle:
    // jeder Eintrag wird live aus bereits vorhandenen Daten berechnet (offene KI-Empfehlungen,
    // Artikel im roten Bereich, bald ablaufende Team-Einladungen), kein Read/Unread-Tracking
    // nötig, kein Risiko von veralteten/verwaisten Benachrichtigungen.
    [ApiController]
    [Authorize]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _ctx;
        private readonly IReturnAnalyticsService _returnAnalytics;

        public NotificationsController(AppDbContext ctx, IReturnAnalyticsService returnAnalytics)
        {
            _ctx = ctx;
            _returnAnalytics = returnAnalytics;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var companyId = User.GetCompanyId();
            var result = new List<NotificationDto>();

            var aiRows = await _ctx.AiRecommendations
                .AsNoTracking()
                .Include(r => r.QualityIssues)
                .Include(r => r.DescriptionProposals)
                .Include(r => r.ActionRecommendations)
                .Where(r => r.CompanyId == companyId)
                .ToListAsync();

            var openRecommendationCount = AiRecommendationProgress.SelectLatestPerArticle(aiRows)
                .Select(AiRecommendationProgress.Count)
                .Count(p => p.OpenCount > 0);

            if (openRecommendationCount > 0)
            {
                result.Add(new NotificationDto
                {
                    Type = "open-recommendations",
                    Message = openRecommendationCount == 1
                        ? "1 Artikel hat eine offene KI-Empfehlung"
                        : $"{openRecommendationCount} Artikel haben offene KI-Empfehlungen",
                    Count = openRecommendationCount,
                    Link = "/retouren-analyse",
                });
            }

            var (yellowThreshold, redThreshold) = await ReturnRateBandService.GetThresholdsAsync(_ctx, companyId);
            var metrics = await _returnAnalytics.GetArticleReturnMetricsAsync();
            var redArticleCount = metrics.Count(m =>
                ReturnRateBandService.ToBand(m.ReturnRatePercent, yellowThreshold, redThreshold) == "red");

            if (redArticleCount > 0)
            {
                result.Add(new NotificationDto
                {
                    Type = "red-articles",
                    Message = redArticleCount == 1
                        ? "1 Artikel ist im roten Bereich"
                        : $"{redArticleCount} Artikel sind im roten Bereich",
                    Count = redArticleCount,
                    Link = "/dashboard",
                });
            }

            // Nur Admins dürfen einladen (siehe TeamController) - nur sie bekommen den Hinweis.
            if (User.IsInRole(RoleNames.Admin))
            {
                var expiringSoon = DateTime.UtcNow.AddDays(2);
                var expiringInviteCount = await _ctx.Users
                    .Where(u => u.CompanyId == companyId
                        && u.PasswordResetToken != null
                        && u.ResetTokenExpires != null
                        && u.ResetTokenExpires > DateTime.UtcNow
                        && u.ResetTokenExpires <= expiringSoon)
                    .CountAsync();

                if (expiringInviteCount > 0)
                {
                    result.Add(new NotificationDto
                    {
                        Type = "expiring-invites",
                        Message = expiringInviteCount == 1
                            ? "1 Team-Einladung läuft bald ab"
                            : $"{expiringInviteCount} Team-Einladungen laufen bald ab",
                        Count = expiringInviteCount,
                        Link = "/settings",
                    });
                }
            }

            return Ok(result);
        }
    }
}
