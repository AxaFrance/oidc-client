using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace OpenIddictDemo;

internal static class DemoEndpoints
{
    private const string ServerScheme = OpenIddictServerAspNetCoreDefaults.AuthenticationScheme;

    public static void Map(WebApplication app)
    {
        app.MapGet("/health", () => Results.Json(new { status = "ready", provider = "OpenIddict", resources = new[] { DemoResources.Orders, DemoResources.Inventory } }));
        app.MapGet("/", () => Results.Content("<h1>Local OpenIddict demo</h1><p>Development fixture only. <a href='http://localhost:5173'>React</a> | <a href='http://localhost:5174'>Native</a></p>", "text/html"));
        app.MapGet("/login", LoginPage);
        app.MapPost("/login", LoginAsync);
        app.MapMethods("/connect/authorize", ["GET", "POST"], (Func<HttpContext, Task<IResult>>)AuthorizeAsync);
        app.MapPost("/connect/token", ExchangeAsync);
        app.MapMethods("/connect/userinfo", ["GET", "POST"], UserInfoAsync);
        app.MapMethods("/connect/endsession", ["GET", "POST"], (Func<HttpContext, Task<IResult>>)LogoutAsync);
        app.MapGet("/connect/checksession", () => Results.Content("<!doctype html><script src='/session.js'></script>", "text/html"));
        app.MapGet("/session.js", () => Results.Text(DemoSession.Script, "text/javascript"));
        app.MapGet("/api/orders", (HttpContext context, DpopValidator validator) => ApiAsync(context, validator, DemoResources.Orders));
        app.MapGet("/api/inventory", (HttpContext context, DpopValidator validator) => ApiAsync(context, validator, DemoResources.Inventory));
    }

    private static IResult LoginPage(HttpContext context, IAntiforgery antiforgery)
    {
        var returnUrl = context.Request.Query["returnUrl"].ToString();
        if (!IsAuthorizationReturnUrl(returnUrl)) return Results.BadRequest("Invalid login return URL.");
        var token = antiforgery.GetAndStoreTokens(context);
        return Results.Content($$"""
            <!doctype html><html lang="en"><meta charset="utf-8"><title>Local OpenIddict sign-in</title>
            <style>body{font:18px system-ui;max-width:640px;margin:80px auto;padding:24px}button{background:#075ccc;color:white;border:0;border-radius:6px;padding:14px;font:inherit}</style>
            <h1>Local OpenIddict sign-in</h1><p>This loopback-only test server uses a fictional Alice account. No real credentials are required.</p>
            <form method="post"><input type="hidden" name="{{token.FormFieldName}}" value="{{HtmlEncoder.Default.Encode(token.RequestToken!)}}">
            <input type="hidden" name="returnUrl" value="{{HtmlEncoder.Default.Encode(returnUrl)}}">
            <button type="submit">Sign in as Alice</button></form><p>Never deploy this identity fixture to production.</p></html>
            """, "text/html");
    }

    private static async Task<IResult> LoginAsync(HttpContext context, IAntiforgery antiforgery)
    {
        try { await antiforgery.ValidateRequestAsync(context); }
        catch (AntiforgeryValidationException)
        {
            context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("DemoLogin").LogWarning("Rejected a login with invalid antiforgery data.");
            return Results.BadRequest("Invalid antiforgery data.");
        }
        var returnUrl = context.Request.Form["returnUrl"].ToString();
        if (!IsAuthorizationReturnUrl(returnUrl)) return Results.BadRequest("Invalid login return URL.");
        var identity = new ClaimsIdentity(DemoResources.CookieScheme);
        identity.AddClaim(new Claim(Claims.Subject, "alice"));
        var properties = new AuthenticationProperties();
        properties.Items["demo-login-return-url"] = returnUrl;
        await context.SignInAsync(DemoResources.CookieScheme, new ClaimsPrincipal(identity), properties);
        context.Response.Cookies.Append(DemoSession.CookieName, Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(24)),
            new CookieOptions { HttpOnly = false, SameSite = SameSiteMode.Lax, Path = "/", MaxAge = TimeSpan.FromMinutes(30) });
        return Results.LocalRedirect(returnUrl);
    }

    private static bool IsAuthorizationReturnUrl(string value) => value.StartsWith("/connect/authorize?", StringComparison.Ordinal);

    private static async Task<IResult> AuthorizeAsync(HttpContext context)
    {
        var request = context.GetOpenIddictServerRequest() ?? throw new InvalidOperationException("Missing OpenIddict request.");
        var cookie = await context.AuthenticateAsync(DemoResources.CookieScheme);
        var returnUrl = context.Request.PathBase + context.Request.Path + context.Request.QueryString;
        var hasCompletedLogin = cookie.Properties?.Items.TryGetValue("demo-login-return-url", out var completedUrl) == true &&
            completedUrl == returnUrl;
        if (!cookie.Succeeded || (request.HasPromptValue(PromptValues.Login) && !hasCompletedLogin))
        {
            if (request.HasPromptValue(PromptValues.None)) return OAuthError("login_required", "Sign in to the local demo first.");
            return Results.Redirect("/login?returnUrl=" + Uri.EscapeDataString(returnUrl));
        }
        if (hasCompletedLogin)
        {
            cookie.Properties!.Items.Remove("demo-login-return-url");
            await context.SignInAsync(DemoResources.CookieScheme, cookie.Principal!, cookie.Properties);
        }
        var resources = DemoResources.Read(request);
        var scopes = request.GetScopes();
        if (resources.Any(resource => !scopes.Contains(DemoResources.ScopeFor(resource))))
            return OAuthError("invalid_scope", "The requested resource requires its API read scope.");
        var identity = new ClaimsIdentity(TokenValidationParameters.DefaultAuthenticationType, Claims.Name, Claims.Role);
        identity.SetClaim(Claims.Subject, "alice");
        identity.SetClaim(Claims.Name, "Alice Example");
        identity.SetClaim(Claims.Email, "alice@example.test");
        identity.SetClaim(Claims.Role, "demo-user");
        var principal = new ClaimsPrincipal(identity);
        principal.SetScopes(scopes);
        principal.SetResources(resources.IsEmpty ? [DemoResources.DefaultAudience] : resources);
        principal.SetClaims(DemoResources.GrantedScopesClaim, scopes);
        principal.SetClaims(DemoResources.GrantedResourcesClaim, principal.GetResources());
        SetDestinations(principal);
        return Results.SignIn(principal, authenticationScheme: ServerScheme);
    }

    private static async Task<IResult> ExchangeAsync(HttpContext context, DpopValidator validator)
    {
        var request = context.GetOpenIddictServerRequest() ?? throw new InvalidOperationException("Missing OpenIddict request.");
        if (!request.IsAuthorizationCodeGrantType() && !request.IsRefreshTokenGrantType())
            return OAuthError("unsupported_grant_type", "Only code and refresh grants are supported.");
        var authentication = await context.AuthenticateAsync(ServerScheme);
        var principal = authentication.Principal ?? throw new InvalidOperationException("The grant was not authenticated.");
        var resources = DemoResources.Read(request);
        var granted = principal.GetClaims(DemoResources.GrantedResourcesClaim);
        if (!resources.IsEmpty && !DemoResources.AreGranted(resources, granted))
            return OAuthError("invalid_target", "The selected resource is outside this authorization grant.");
        var scopes = request.GetScopes();
        if (scopes.IsEmpty) scopes = principal.GetScopes();
        if (resources.Any(resource => !scopes.Contains(DemoResources.ScopeFor(resource))))
            return OAuthError("invalid_scope", "The selected resource requires its API read scope.");
        var thumbprint = principal.GetClaim(DemoResources.DpopThumbprintClaim);
        var proof = context.Request.Headers["DPoP"].ToString();
        if (!string.IsNullOrEmpty(proof) || thumbprint is not null)
        {
            var validation = await validator.ValidateAsync(new DpopRequest
            {
                Proof = proof, Method = context.Request.Method, TargetUri = context.Request.GetEncodedUrl(),
                Thumbprint = thumbprint, Nonce = validator.AuthorizationNonce,
            });
            context.Response.Headers["DPoP-Nonce"] = validator.AuthorizationNonce;
            if (!validation.IsValid) return JsonError(validation.Error!, validation.Description!, StatusCodes.Status400BadRequest);
            principal.SetClaim(DemoResources.DpopThumbprintClaim, validation.Thumbprint);
            principal.SetClaim("cnf", JsonSerializer.SerializeToElement(new { jkt = validation.Thumbprint }));
        }
        principal.SetScopes(scopes);
        if (!resources.IsEmpty) principal.SetResources(resources);
        principal.SetAccessTokenLifetime(resources.Length == 1
            ? TimeSpan.FromSeconds(resources[0] == DemoResources.Orders ? 15 : 20)
            : TimeSpan.FromSeconds(60));
        SetDestinations(principal);
        return Results.SignIn(principal, authenticationScheme: ServerScheme);
    }

    private static void SetDestinations(ClaimsPrincipal principal) => principal.SetDestinations(claim => claim.Type switch
    {
        Claims.Subject => [Destinations.AccessToken, Destinations.IdentityToken],
        Claims.Name when principal.HasScope(Scopes.Profile) => [Destinations.AccessToken, Destinations.IdentityToken],
        Claims.Email when principal.HasScope(Scopes.Email) => [Destinations.AccessToken, Destinations.IdentityToken],
        Claims.Role or "cnf" => [Destinations.AccessToken],
        _ => [],
    });

    private static async Task<IResult> UserInfoAsync(HttpContext context, DpopValidator validator)
    {
        var authentication = await context.AuthenticateAsync(ServerScheme);
        if (authentication.Principal is not { } principal) return JsonError("invalid_token", "Userinfo could not authenticate the access token.", 401);
        var error = await ValidateApiProofAsync(context, principal, validator, DemoResources.DefaultAudience);
        return error ?? Results.Json(new { sub = principal.GetClaim(Claims.Subject), name = "Alice Example", email = "alice@example.test", role = new[] { "demo-user" } });
    }

    private static async Task<IResult> ApiAsync(HttpContext context, DpopValidator validator, string resource)
    {
        if (context.Request.Host.Port != new Uri(resource).Port) return Results.NotFound();
        var authentication = await context.AuthenticateAsync(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
        if (authentication.Principal is not { } principal)
        {
            context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("DemoApi")
                .LogWarning("Access token validation failed: {Failure}", authentication.Failure?.GetType().Name ?? "no authentication result");
            return JsonError("invalid_token", "The API could not authenticate the access token.", 401);
        }
        if (!principal.GetAudiences().Contains(resource, StringComparer.Ordinal) ||
            !principal.HasScope(DemoResources.ScopeFor(resource)))
            return JsonError("invalid_token", "The token is not intended for this API.", StatusCodes.Status403Forbidden);
        var error = await ValidateApiProofAsync(context, principal, validator, resource);
        if (error is not null) return error;
        return Results.Json(new
        {
            api = resource == DemoResources.Orders ? "orders" : "inventory", resource,
            subject = principal.GetClaim(Claims.Subject), clientId = principal.GetPresenters().FirstOrDefault(),
            tokenId = principal.GetClaim(Claims.JwtId), scopes = principal.GetScopes(),
            tokenType = principal.GetClaim("cnf") is null ? "Bearer" : "DPoP",
        });
    }

    private static async Task<IResult?> ValidateApiProofAsync(HttpContext context, ClaimsPrincipal principal, DpopValidator validator, string resource)
    {
        var authorization = context.Items["demo-authorization"] as string ?? "";
        var hasDpop = authorization.StartsWith("DPoP ", StringComparison.OrdinalIgnoreCase);
        var confirmation = principal.GetClaim("cnf");
        if (confirmation is null) return hasDpop ? JsonError("invalid_token", "The token is not DPoP-bound.", 401) : null;
        if (!hasDpop) return JsonError("invalid_token", "A bound token cannot be used as Bearer.", 401);
        var jkt = JsonDocument.Parse(confirmation).RootElement.GetProperty("jkt").GetString();
        var nonce = validator.NonceFor(resource);
        context.Response.Headers["DPoP-Nonce"] = nonce;
        var result = await validator.ValidateAsync(new DpopRequest
        {
            Proof = context.Request.Headers["DPoP"].ToString(), Method = context.Request.Method,
            TargetUri = context.Request.GetEncodedUrl(), AccessToken = authorization[5..],
            Thumbprint = jkt, Nonce = nonce, ShouldRequireNonce = resource != DemoResources.DefaultAudience,
        });
        if (result.IsValid) return null;
        context.Response.Headers.WWWAuthenticate = $"DPoP error=\"{result.Error}\"";
        return JsonError(result.Error!, result.Description!, 401);
    }

    private static async Task<IResult> LogoutAsync(HttpContext context)
    {
        await context.SignOutAsync(DemoResources.CookieScheme);
        context.Response.Cookies.Delete(DemoSession.CookieName);
        return Results.SignOut(authenticationSchemes: [ServerScheme]);
    }

    private static IResult OAuthError(string error, string description) => Results.Forbid(
        new AuthenticationProperties(new Dictionary<string, string?>
        {
            [OpenIddictServerAspNetCoreConstants.Properties.Error] = error,
            [OpenIddictServerAspNetCoreConstants.Properties.ErrorDescription] = description,
        }), [ServerScheme]);

    private static IResult JsonError(string error, string description, int status) =>
        Results.Json(new { error, error_description = description }, statusCode: status);
}
