using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Extensions;
using RevolvAPI.Models;
using RevolvAPI.Services;
using Microsoft.AspNetCore.Authorization;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/settings")]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _ctx;

        public SettingsController(AppDbContext ctx) => _ctx = ctx;

        // GET stays authenticated-only: dashboard / Retouren-Analyse read thresholds for all roles.
        [HttpGet]
        public async Task<ActionResult<ShopSettingDto>> GetSettings()
        {
            var settings = await GetOrCreateForCompanyAsync(User.GetCompanyId());
            return Ok(ToDto(settings));
        }

        // Settings page is Admin-only in the UI; enforce the same on write so demoted users
        // cannot change ToneOfVoice / thresholds / AutoAnalyze via the API.
        [HttpPut]
        [Authorize(Roles = RoleNames.Admin)]
        public async Task<ActionResult<ShopSettingDto>> UpdateSettings([FromBody] ShopSettingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (dto.ThresholdYellow < 0 || dto.ThresholdRed > 100 || dto.ThresholdYellow >= dto.ThresholdRed)
            {
                return BadRequest("Gelber Schwellenwert muss kleiner als der rote sein (0–100).");
            }

            var settings = await GetOrCreateForCompanyAsync(User.GetCompanyId());

            settings.ToneOfVoice = ToneOfVoiceOptions.Normalize(dto.ToneOfVoice);
            settings.ThresholdYellow = dto.ThresholdYellow;
            settings.ThresholdRed = dto.ThresholdRed;
            settings.AutoAnalyzeNewIssues = dto.AutoAnalyzeNewIssues;
            settings.MinNewReturnsForReanalyze = dto.MinNewReturnsForReanalyze;
            settings.SignificantReasonShiftPercentagePoints = dto.SignificantReasonShiftPercentagePoints;

            await _ctx.SaveChangesAsync();

            return Ok(ToDto(settings));
        }

        // Folge-Ticket zu #190: eine Settings-Zeile pro Firma statt eines globalen Singletons.
        // Ensures exactly one ShopSettings row per company (StrictMode double-GET can otherwise
        // create duplicates).
        private async Task<ShopSetting> GetOrCreateForCompanyAsync(int companyId)
        {
            var all = await _ctx.ShopSettings
                .Where(s => s.CompanyId == companyId)
                .OrderBy(s => s.Id)
                .ToListAsync();

            if (all.Count == 0)
            {
                var created = new ShopSetting { CompanyId = companyId };
                _ctx.ShopSettings.Add(created);
                await _ctx.SaveChangesAsync();
                return created;
            }

            if (all.Count > 1)
            {
                _ctx.ShopSettings.RemoveRange(all.Skip(1));
                await _ctx.SaveChangesAsync();
            }

            return all[0];
        }

        private static ShopSettingDto ToDto(ShopSetting settings) => new ShopSettingDto
        {
            // Normalize so a previously injected DB value cannot reappear in the UI/API.
            ToneOfVoice = ToneOfVoiceOptions.Normalize(settings.ToneOfVoice),
            ThresholdYellow = settings.ThresholdYellow,
            ThresholdRed = settings.ThresholdRed,
            AutoAnalyzeNewIssues = settings.AutoAnalyzeNewIssues,
            MinNewReturnsForReanalyze = settings.MinNewReturnsForReanalyze,
            SignificantReasonShiftPercentagePoints = settings.SignificantReasonShiftPercentagePoints
        };
    }
}
