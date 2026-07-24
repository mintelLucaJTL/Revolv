using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;
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

        // GET api/settings
        // Always returns the single shop-settings row (creates defaults if missing).
        [HttpGet]
        public async Task<ActionResult<ShopSettingDto>> GetSettings()
        {
            var settings = await GetOrCreateSingletonAsync();
            return Ok(ToDto(settings));
        }

        // PUT api/settings
        // Overwrites the single shop-settings row with the values from the DTO.
        [HttpPut]
        public async Task<ActionResult<ShopSettingDto>> UpdateSettings([FromBody] ShopSettingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Validate the thresholds.
            if (dto.ThresholdYellow < 0 || dto.ThresholdRed > 100 || dto.ThresholdYellow >= dto.ThresholdRed)
            {
                return BadRequest("Gelber Schwellenwert muss kleiner als der rote sein (0–100).");
            }

            // Get or create the settings row.
            var settings = await GetOrCreateSingletonAsync();

            // Update the settings.
            settings.ToneOfVoice = dto.ToneOfVoice;
            settings.ThresholdYellow = dto.ThresholdYellow;
            settings.ThresholdRed = dto.ThresholdRed;
            settings.AutoAnalyzeNewIssues = dto.AutoAnalyzeNewIssues;

            await _ctx.SaveChangesAsync();

            return Ok(ToDto(settings));
        }

        // Ensures exactly one ShopSettings row exists (StrictMode/double-GET can otherwise
        private async Task<ShopSetting> GetOrCreateSingletonAsync()
        {
            // Get all settings rows.
            var all = await _ctx.ShopSettings.OrderBy(s => s.Id).ToListAsync();

            // If no settings rows exist, create a new one.
            if (all.Count == 0)
            {
                var created = new ShopSetting();
                _ctx.ShopSettings.Add(created);
                await _ctx.SaveChangesAsync();
                return created;
            }

            // If more than one settings row exists, remove the extras.
            if (all.Count > 1)
            {
                _ctx.ShopSettings.RemoveRange(all.Skip(1));
                await _ctx.SaveChangesAsync();
            }

            // Return the first settings row.
            return all[0];
        }

        // Maps the ShopSetting entity to the ShopSettingDto.
        private static ShopSettingDto ToDto(ShopSetting settings) => new ShopSettingDto
        {
            ToneOfVoice = settings.ToneOfVoice,
            ThresholdYellow = settings.ThresholdYellow,
            ThresholdRed = settings.ThresholdRed,
            AutoAnalyzeNewIssues = settings.AutoAnalyzeNewIssues
        };
    }
}
