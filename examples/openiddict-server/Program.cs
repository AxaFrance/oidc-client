using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Abstractions;
using OpenIddict.Server;
using OpenIddictDemo;

var builder = WebApplication.CreateBuilder(args);
if (!builder.Environment.IsDevelopment())
    throw new InvalidOperationException("The OpenIddict demo is a loopback-only Development fixture, not a production identity server.");
builder.WebHost.UseUrls(DemoResources.Issuer.TrimEnd('/'), DemoResources.Orders, DemoResources.Inventory);
Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, ".data"));
builder.Services.AddDbContext<DemoDbContext>(options =>
{
    options.UseSqlite($"Data Source={Path.Combine(builder.Environment.ContentRootPath, ".data", "openiddict.db")}");
    options.UseOpenIddict();
});
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<DpopValidator>();
builder.Services.AddAntiforgery();
builder.Services.AddAuthentication().AddCookie(DemoResources.CookieScheme, options =>
{
    options.Cookie.Name = "openiddict-demo-auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(DemoResources.Origins).AllowAnyHeader().AllowAnyMethod()
        .WithExposedHeaders("DPoP-Nonce", "WWW-Authenticate")));
builder.Services.AddOpenIddict()
    .AddCore(options => options.UseEntityFrameworkCore().UseDbContext<DemoDbContext>())
    .AddServer(options =>
    {
        options.SetIssuer(new Uri(DemoResources.Issuer));
        options.SetAuthorizationEndpointUris("/connect/authorize")
            .SetTokenEndpointUris("/connect/token")
            .SetPushedAuthorizationEndpointUris("/connect/par")
            .SetUserInfoEndpointUris("/connect/userinfo")
            .SetEndSessionEndpointUris("/connect/endsession")
            .SetRevocationEndpointUris("/connect/revocation");
        options.AllowAuthorizationCodeFlow().AllowRefreshTokenFlow();
        options.RequireProofKeyForCodeExchange();
        options.RegisterScopes(DemoResources.Scopes);
        options.RegisterResources(DemoResources.Orders, DemoResources.Inventory);
        options.SetAccessTokenLifetime(TimeSpan.FromSeconds(60));
        options.SetIdentityTokenLifetime(TimeSpan.FromMinutes(5));
        options.SetRefreshTokenLifetime(TimeSpan.FromMinutes(30));
        options.AddEphemeralEncryptionKey().AddEphemeralSigningKey().DisableAccessTokenEncryption();
        // OpenIddict's built-in confirmation validator supports mTLS, not jkt; the endpoints validate DPoP instead.
        options.RemoveEventHandler(OpenIddictServerHandlers.Protection.ValidateProofOfPossession.Descriptor);
        options.UseAspNetCore().DisableTransportSecurityRequirement()
            .EnableAuthorizationEndpointPassthrough().EnableTokenEndpointPassthrough()
            .EnableUserInfoEndpointPassthrough().EnableEndSessionEndpointPassthrough();
        options.AddEventHandler<OpenIddictServerEvents.ProcessSignInContext>(handler =>
            handler.SetOrder(OpenIddictServerHandlers.PrepareAccessTokenPrincipal.Descriptor.Order + 500)
                .UseInlineHandler(context =>
                {
                    if (context.AccessTokenPrincipal is { } access &&
                        context.Principal?.GetClaim(DemoResources.DpopThumbprintClaim) is { } thumbprint)
                        access.SetClaim("cnf", JsonSerializer.SerializeToElement(new { jkt = thumbprint }));
                    return default;
                }));
        options.AddEventHandler<OpenIddictServerEvents.ProcessSignInContext>(handler =>
            handler.SetOrder(OpenIddictServerHandlers.PrepareRefreshTokenPrincipal.Descriptor.Order + 500)
                .UseInlineHandler(context =>
                {
                    if (context.RefreshTokenPrincipal is not null && context.Principal is { } principal)
                    {
                        context.RefreshTokenPrincipal.SetScopes(principal.GetClaims(DemoResources.GrantedScopesClaim));
                        context.RefreshTokenPrincipal.SetResources(principal.GetClaims(DemoResources.GrantedResourcesClaim));
                    }
                    return default;
                }));
        options.AddEventHandler<OpenIddictServerEvents.ProcessSignInContext>(handler =>
            handler.SetOrder(OpenIddictServerHandlers.AttachSignInParameters.Descriptor.Order + 500)
                .UseInlineHandler(context =>
                {
                    if (!string.IsNullOrEmpty(context.Response.AccessToken) &&
                        context.Principal?.GetClaim(DemoResources.DpopThumbprintClaim) is not null)
                        context.Response.TokenType = "DPoP";
                    DemoSession.AttachState(context);
                    return default;
                }));
        options.AddEventHandler<OpenIddictServerEvents.ApplyConfigurationResponseContext>(handler =>
            handler.UseInlineHandler(context =>
            {
                context.Response["dpop_signing_alg_values_supported"] = new OpenIddictParameter(System.Collections.Immutable.ImmutableArray.Create<string?>("ES256", "RS256"));
                context.Response["check_session_iframe"] = DemoResources.Issuer + "connect/checksession";
                return default;
            }));
    })
    .AddValidation(options =>
    {
        options.UseLocalServer();
        options.AddAudiences(DemoResources.DefaultAudience, DemoResources.Orders, DemoResources.Inventory);
        options.EnableTokenEntryValidation();
        options.RemoveEventHandler(OpenIddict.Validation.OpenIddictValidationHandlers.Protection.ValidateProofOfPossession.Descriptor);
        options.UseAspNetCore();
    });

var app = builder.Build();
app.Use(async (context, next) =>
{
    if (context.Connection.RemoteIpAddress is not { } address || !IPAddress.IsLoopback(address) ||
        context.Request.Host.Host is not ("localhost" or "127.0.0.1" or "[::1]"))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }
    if (context.Request.Host.Port != 7001 && !context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    var authorization = context.Request.Headers.Authorization.ToString();
    context.Items["demo-authorization"] = authorization;
    if (authorization.StartsWith("DPoP ", StringComparison.OrdinalIgnoreCase))
        context.Request.Headers.Authorization = "Bearer " + authorization[5..];
    await next(context);
});
app.UseCors();
app.UseAuthentication();
DemoEndpoints.Map(app);
await DemoSeed.InitializeAsync(app.Services);
await app.RunAsync();
