using System.Security.Claims;

namespace RevolvAPI.Extensions
{
    // Folge-Ticket zu #190: zentrale Stelle, um die CompanyId aus dem JWT zu lesen, statt den
    // Claim-Namen "CompanyId" (siehe TokenService.CreateAccessToken) an jeder Filterstelle neu
    // zu tippen.
    public static class ClaimsPrincipalExtensions
    {
        // Wirft, wenn der Claim fehlt - z. B. weil ein Endpunkt versehentlich kein [Authorize]
        // hat. Lieber laut scheitern als leise ungefilterte (firmenübergreifende) Daten liefern.
        public static int GetCompanyId(this ClaimsPrincipal user)
        {
            var claim = user.FindFirst("CompanyId");

            if (claim == null || !int.TryParse(claim.Value, out var companyId))
            {
                throw new InvalidOperationException(
                    "CompanyId-Claim fehlt oder ist ungültig - Endpunkt braucht [Authorize].");
            }

            return companyId;
        }
    }
}
