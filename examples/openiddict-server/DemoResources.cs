using System.Collections.Immutable;
using OpenIddict.Abstractions;

namespace OpenIddictDemo;

internal static class DemoResources
{
    public const string Issuer = "http://localhost:7001/";
    public const string Orders = "http://localhost:7002/";
    public const string Inventory = "http://localhost:7003/";
    public const string DefaultAudience = "demo-api";
    public const string GrantedResourcesClaim = "demo:granted_resources";
    public const string GrantedScopesClaim = "demo:granted_scopes";
    public const string DpopThumbprintClaim = "demo:dpop_jkt";
    public const string CookieScheme = "demo-cookie";
    public static readonly string[] Origins = ["http://localhost:5173", "http://localhost:5174"];
    public static readonly string[] Scopes = ["openid", "profile", "email", "api", "offline_access", "orders.read", "inventory.read"];

    public static ImmutableArray<string> Read(OpenIddictRequest request) =>
        request.GetResources();

    public static bool AreGranted(IEnumerable<string> resources, IEnumerable<string> granted) =>
        resources.All(resource => granted.Contains(resource, StringComparer.Ordinal));

    public static string ScopeFor(string resource) => resource switch
    {
        Orders => "orders.read",
        Inventory => "inventory.read",
        _ => throw new ArgumentException("Unknown demo resource.", nameof(resource)),
    };
}
