using Microsoft.AspNetCore.Mvc;
using RevolvAPI.Data;
using RevolvAPI.Services;

namespace RevolvAPI.Controllers
{

    [ApiController]
    [Route("api/[controller]")]

    public class ReturnController : Controller
    {
        private readonly AppDbContext _ctx;




        public ReturnController(AppDbContext ctx)
        {
            _ctx = ctx;
        }
     



    }

}
