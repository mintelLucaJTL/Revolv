using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
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

        [HttpGet]
        public async Task<ActionResult<ShopSettingDto>> GetSettings()
        {
            var settings = await GetOrCreateSingletonAsync();
            return Ok(ToDto(settings));
        }

        [HttpPut]
        public async Task<ActionResult<ShopSettingDto>> UpdateSettings([FromBody] ShopSettingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (dto.ThresholdYellow < 0 || dto.ThresholdRed > 100 || dto.ThresholdYellow >= dto.ThresholdRed)
            {
                return BadRequest("Gelber Schwellenwert muss kleiner als der rote sein (0–100).");
            }

            if (!ToneOfVoiceOptions.IsAllowed(dto.ToneOfVoice))
            {
                return BadRequest(
                    $"Ungültige Tonalität. Erlaubt: {string.Join(", ", ToneOfVoiceOptions.Allowed)}.");
            }

            var settings = await GetOrCreateSingletonAsync();

            settings.ToneOfVoice = ToneOfVoiceOptions.Normalize(dto.ToneOfVoice);
            settings.ThresholdYellow = dto.ThresholdYellow;
            settings.ThresholdRed = dto.ThresholdRed;
            settings.AutoAnalyzeNewIssues = dto.AutoAnalyzeNewIssues;

            await _ctx.SaveChangesAsync();

            return Ok(ToDto(settings));
        }

        // Ensures exactly one ShopSettings row (StrictMode double-GET can otherwise create duplicates).
        private async Task<ShopSetting> GetOrCreateSingletonAsync()
        {
            var all = await _ctx.ShopSettings.OrderBy(s => s.Id).ToListAsync();

            if (all.Count == 0)
            {
                var created = new ShopSetting();
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
            AutoAnalyzeNewIssues = settings.AutoAnalyzeNewIssues
        };
    }
}
