using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RevolvAPI.Data;
using RevolvAPI.DTOs;
using RevolvAPI.Models;

namespace RevolvAPI.Controllers
{
    [ApiController]
    [Route("api/settings")]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _ctx;

        public SettingsController(AppDbContext ctx) => _ctx = ctx;

        // GET api/settings
        // Returns the shop settings. If no row exists yet, a default row is created,
        // persisted and returned so the frontend can always rely on a valid response.
        [HttpGet]
        public async Task<ActionResult<ShopSettingDto>> GetSettings()
        {
            var settings = await _ctx.ShopSettings.FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new ShopSetting();
                _ctx.ShopSettings.Add(settings);
                await _ctx.SaveChangesAsync();
            }

            return Ok(ToDto(settings));
        }

        // PUT api/settings
        // Overwrites the (single) shop settings row with the values from the DTO.
        [HttpPut]
        public async Task<ActionResult<ShopSettingDto>> UpdateSettings([FromBody] ShopSettingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var settings = await _ctx.ShopSettings.FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new ShopSetting();
                _ctx.ShopSettings.Add(settings);
            }

            settings.ToneOfVoice = dto.ToneOfVoice;
            settings.ThresholdYellow = dto.ThresholdYellow;
            settings.ThresholdRed = dto.ThresholdRed;
            settings.AutoAnalyzeNewIssues = dto.AutoAnalyzeNewIssues;

            await _ctx.SaveChangesAsync();

            return Ok(ToDto(settings));
        }

        private static ShopSettingDto ToDto(ShopSetting settings) => new ShopSettingDto
        {
            ToneOfVoice = settings.ToneOfVoice,
            ThresholdYellow = settings.ThresholdYellow,
            ThresholdRed = settings.ThresholdRed,
            AutoAnalyzeNewIssues = settings.AutoAnalyzeNewIssues
        };
    }
}
