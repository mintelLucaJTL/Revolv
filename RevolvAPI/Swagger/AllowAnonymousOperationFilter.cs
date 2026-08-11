using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace RevolvAPI.Swagger;

// Clears document-level Bearer security on [AllowAnonymous] operations so Swagger UI
// does not mark login/register/refresh (and other public endpoints) as JWT-required.
public sealed class AllowAnonymousOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var allowAnonymous = context.ApiDescription.ActionDescriptor.EndpointMetadata
            .OfType<AllowAnonymousAttribute>()
            .Any();

        if (!allowAnonymous)
            return;

        // Explicit empty list overrides document-level security; null would fall back to global Bearer.
        operation.Security = new List<OpenApiSecurityRequirement>();
    }
}
