using OpenIddict.Abstractions;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace OpenIddictDemo;

internal static class DemoSeed
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<DemoDbContext>().Database.EnsureCreatedAsync();
        var manager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();
        foreach (var clientId in new[] { "interactive.public.short", "local.google" })
        {
            var descriptor = new OpenIddictApplicationDescriptor
            {
                ClientId = clientId,
                ClientType = ClientTypes.Public,
                ConsentType = ConsentTypes.Implicit,
                DisplayName = "Local React and native OIDC demos",
            };
            foreach (var origin in DemoResources.Origins)
            {
                foreach (var path in new[]
                {
                    "/authentication/callback", "/authentication/silent-callback",
                    "/multi-auth/authentification/callback", "/multi-auth/authentification/silent-callback",
                    "/multi-auth/authentification/hash-callback", "/multi-auth/authentification/hash-silent-callback",
                    "/multi-auth/callback-google", "/multi-auth/silent-callback-google",
                })
                    descriptor.RedirectUris.Add(new Uri(origin + path));
                foreach (var path in new[] { "/", "/profile", "/multi-auth", "/resources",
                    "/profile-secure-component", "/profile-secure-hoc",
                    "/user-fetch-secure-hoc", "/user-fetch-secure-hook" })
                {
                    descriptor.PostLogoutRedirectUris.Add(new Uri(origin + path));
                    foreach (var dpop in new[] { "true", "false" })
                    {
                        descriptor.PostLogoutRedirectUris.Add(new Uri(origin + path + "?dpop=" + dpop));
                        foreach (var worker in new[] { "on", "off" })
                        {
                            descriptor.PostLogoutRedirectUris.Add(new Uri($"{origin}{path}?dpop={dpop}&worker={worker}"));
                            descriptor.PostLogoutRedirectUris.Add(new Uri($"{origin}{path}?worker={worker}&dpop={dpop}"));
                        }
                    }
                    foreach (var worker in new[] { "on", "off" })
                        descriptor.PostLogoutRedirectUris.Add(new Uri(origin + path + "?worker=" + worker));
                }
            }
            descriptor.Permissions.UnionWith([
                Permissions.Endpoints.Authorization, Permissions.Endpoints.Token,
                Permissions.Endpoints.PushedAuthorization, Permissions.Endpoints.EndSession,
                Permissions.Endpoints.Revocation, Permissions.GrantTypes.AuthorizationCode,
                Permissions.GrantTypes.RefreshToken, Permissions.ResponseTypes.Code,
            ]);
            foreach (var value in DemoResources.Scopes.Where(value => value is not (Scopes.OpenId or Scopes.OfflineAccess)))
                descriptor.Permissions.Add(Permissions.Prefixes.Scope + value);
            descriptor.Requirements.Add(Requirements.Features.ProofKeyForCodeExchange);
            descriptor.AddResourcePermissions(DemoResources.Orders, DemoResources.Inventory);
            var existing = await manager.FindByClientIdAsync(clientId);
            if (existing is null) await manager.CreateAsync(descriptor);
            else await manager.UpdateAsync(existing, descriptor);
        }
    }
}
