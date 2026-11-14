using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace OpenIddictDemo;

internal sealed record DpopResult(bool IsValid, string? Thumbprint, string? Error, string? Description)
{
    public static DpopResult Reject(string description, string error = "invalid_dpop_proof") =>
        new(false, null, error, description);
}

internal sealed record DpopRequest
{
    public required string Proof { get; init; }
    public required string Method { get; init; }
    public required string TargetUri { get; init; }
    public string? AccessToken { get; init; }
    public string? Thumbprint { get; init; }
    public string? Nonce { get; init; }
    public bool ShouldRequireNonce { get; init; }
}

internal sealed class DpopValidator(TimeProvider clock, ILogger<DpopValidator> logger)
{
    private readonly ConcurrentDictionary<string, long> replayCache = new(StringComparer.Ordinal);
    public string AuthorizationNonce { get; } = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(24));
    public string OrdersNonce { get; } = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(24));
    public string InventoryNonce { get; } = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(24));

    public string NonceFor(string resource) => resource switch
    {
        DemoResources.Orders => OrdersNonce,
        DemoResources.Inventory => InventoryNonce,
        _ => AuthorizationNonce,
    };

    public async Task<DpopResult> ValidateAsync(DpopRequest request)
    {
        var proof = request.Proof;
        if (string.IsNullOrEmpty(proof) || proof.Length > 8192 || proof.Count(character => character == '.') != 2)
            return DpopResult.Reject("A bounded, signed DPoP JWT is required.");
        try
        {
            var token = new JsonWebToken(proof);
            if (!string.Equals(token.Typ, "dpop+jwt", StringComparison.OrdinalIgnoreCase) ||
                token.Alg is not ("ES256" or "RS256") ||
                !token.TryGetHeaderValue<JsonElement>("jwk", out var json) || json.ValueKind != JsonValueKind.Object)
                return DpopResult.Reject("The DPoP type, algorithm, or public JWK is invalid.");
            if (new[] { "d", "p", "q", "dp", "dq", "qi", "k", "x5c", "x5u" }.Any(name => json.TryGetProperty(name, out _)))
                return DpopResult.Reject("Private or symmetric key material is not permitted.");
            var key = new JsonWebKey(json.GetRawText());
            if ((token.Alg == "ES256" && (key.Kty != "EC" || key.Crv != "P-256")) ||
                (token.Alg == "RS256" && (key.Kty != "RSA" || key.KeySize < 2048)))
                return DpopResult.Reject("The proof key does not match an allowed asymmetric algorithm.");
            var result = await new JsonWebTokenHandler().ValidateTokenAsync(proof, new TokenValidationParameters
            {
                IssuerSigningKey = key,
                RequireSignedTokens = true,
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = false,
                ValidAlgorithms = ["ES256", "RS256"],
                ValidTypes = ["dpop+jwt"],
            });
            if (!result.IsValid)
                return DpopResult.Reject("The DPoP signature is invalid.");
            var jkt = Base64UrlEncoder.Encode(key.ComputeJwkThumbprint());
            if (request.Thumbprint is not null && !FixedEquals(jkt, request.Thumbprint))
                return DpopResult.Reject("The proof key is not bound to this grant or token.");
            if (!token.TryGetPayloadValue<string>("htm", out var htm) || htm != request.Method ||
                !token.TryGetPayloadValue<string>("htu", out var htu) ||
                !Uri.TryCreate(htu, UriKind.Absolute, out var uri) || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment) ||
                uri.GetLeftPart(UriPartial.Path) != new Uri(request.TargetUri).GetLeftPart(UriPartial.Path))
                return DpopResult.Reject("The proof method or target URI does not match.");
            var now = clock.GetUtcNow().ToUnixTimeSeconds();
            if (!token.TryGetPayloadValue<long>("iat", out var issued) || issued < now - 60 || issued > now + 60 ||
                !token.TryGetPayloadValue<string>("jti", out var identifier) || string.IsNullOrEmpty(identifier) || identifier.Length > 200)
                return DpopResult.Reject("The proof timestamp or identifier is invalid.");
            if (request.AccessToken is not null &&
                (!token.TryGetPayloadValue<string>("ath", out var hash) || !FixedEquals(hash, Hash(request.AccessToken))))
                return DpopResult.Reject("The proof access-token hash does not match.");
            var hasNonce = token.TryGetPayloadValue<string>("nonce", out var suppliedNonce);
            if (request.Nonce is not null && ((request.ShouldRequireNonce && !hasNonce) || (hasNonce && !FixedEquals(suppliedNonce, request.Nonce))))
                return DpopResult.Reject("Use the nonce returned by this endpoint.", "use_dpop_nonce");
            foreach (var entry in replayCache.Where(entry => entry.Value < now - 120))
                replayCache.TryRemove(entry.Key, out _);
            if (!replayCache.TryAdd($"{jkt}:{identifier}", now))
                return DpopResult.Reject("The DPoP proof was already used.");
            return new DpopResult(true, jkt, null, null);
        }
        catch (Exception exception) when (exception is ArgumentException or JsonException or SecurityTokenException or FormatException)
        {
            logger.LogWarning("Rejected malformed DPoP proof: {ExceptionType}", exception.GetType().Name);
            return DpopResult.Reject("The proof cannot be decoded or validated.");
        }
    }

    public static string Hash(string value) => Base64UrlEncoder.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(value)));

    private static bool FixedEquals(string first, string second) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(first), Encoding.UTF8.GetBytes(second));
}
