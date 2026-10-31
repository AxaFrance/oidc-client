using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace OpenIddictDemo.Tests;

public sealed class DpopValidatorTests : IDisposable
{
    private readonly ECDsa signingKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    private readonly DpopValidator validator = new(TimeProvider.System, NullLogger<DpopValidator>.Instance);
    private const string Target = DemoResources.Orders + "api/orders";

    private string Proof(Dictionary<string, object>? extras = null, SecurityKey? key = null, Dictionary<string, object>? headers = null)
    {
        key ??= new ECDsaSecurityKey(signingKey);
        var publicKey = JsonWebKeyConverter.ConvertFromSecurityKey(key);
        var jwk = key is RsaSecurityKey
            ? JsonSerializer.SerializeToElement(new { publicKey.Kty, publicKey.N, publicKey.E }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
            : JsonSerializer.SerializeToElement(new { publicKey.Kty, publicKey.Crv, publicKey.X, publicKey.Y }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        var claims = new Dictionary<string, object>
        {
            ["htm"] = "GET", ["htu"] = Target, ["iat"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["jti"] = Guid.NewGuid().ToString(), ["ath"] = DpopValidator.Hash("test-access-token"),
            ["nonce"] = validator.OrdersNonce,
        };
        foreach (var claim in extras ?? []) claims[claim.Key] = claim.Value;
        var header = new Dictionary<string, object> { ["typ"] = "dpop+jwt", ["jwk"] = jwk };
        foreach (var value in headers ?? []) header[value.Key] = value.Value;
        return new JsonWebTokenHandler { SetDefaultTimesOnTokenCreation = false }.CreateToken(new SecurityTokenDescriptor
        {
            Claims = claims, AdditionalHeaderClaims = header,
            SigningCredentials = new SigningCredentials(key, key is RsaSecurityKey ? SecurityAlgorithms.RsaSha256 : SecurityAlgorithms.EcdsaSha256),
        });
    }

    private DpopRequest Request(string proof) => new()
    {
        Proof = proof, Method = "GET", TargetUri = Target + "?limit=2",
        AccessToken = "test-access-token", Nonce = validator.OrdersNonce, ShouldRequireNonce = true,
    };

    [Fact]
    public async Task ValidatesSignedBoundProofAndRejectsReplay()
    {
        var request = Request(Proof());
        var result = await validator.ValidateAsync(request);
        Assert.True(result.IsValid, result.Description);
        Assert.NotNull(result.Thumbprint);
        Assert.False((await validator.ValidateAsync(request)).IsValid);
    }

    [Fact]
    public async Task AcceptsRsaProof()
    {
        using var rsa = RSA.Create(2048);
        var result = await validator.ValidateAsync(Request(Proof(key: new RsaSecurityKey(rsa))));
        Assert.True(result.IsValid, result.Description);
    }

    [Theory]
    [InlineData("htm", "POST")]
    [InlineData("htu", Target + "?limit=2")]
    [InlineData("htu", Target + "#fragment")]
    [InlineData("htu", DemoResources.Inventory + "api/inventory")]
    [InlineData("jti", "")]
    [InlineData("ath", "wrong-hash")]
    [InlineData("nonce", "wrong-nonce")]
    public async Task RejectsMismatchedClaims(string name, string value)
    {
        Assert.False((await validator.ValidateAsync(Request(Proof(new() { [name] = value })))).IsValid);
    }

    [Theory]
    [InlineData(long.MinValue)]
    [InlineData(long.MaxValue)]
    [InlineData(1L)]
    public async Task RejectsExpiredOrOverflowingTimestamps(long issued)
    {
        Assert.False((await validator.ValidateAsync(Request(Proof(new() { ["iat"] = issued })))).IsValid);
    }

    [Fact]
    public async Task RejectsAnotherBindingKeyAndInvalidSignature()
    {
        Assert.False((await validator.ValidateAsync(Request(Proof()) with { Thumbprint = "different-key" })).IsValid);
        using var other = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var publicKey = JsonWebKeyConverter.ConvertFromSecurityKey(new ECDsaSecurityKey(other));
        var header = JsonSerializer.SerializeToElement(new { kty = "EC", crv = "P-256", x = publicKey.X, y = publicKey.Y });
        Assert.False((await validator.ValidateAsync(Request(Proof(headers: new() { ["jwk"] = header })))).IsValid);
    }

    [Theory]
    [InlineData("d")]
    [InlineData("k")]
    [InlineData("x5u")]
    [InlineData("x5c")]
    public async Task RejectsPrivateAndRemoteKeyFields(string field)
    {
        var key = JsonWebKeyConverter.ConvertFromSecurityKey(new ECDsaSecurityKey(signingKey));
        var jwk = new Dictionary<string, object> { ["kty"] = "EC", ["crv"] = "P-256", ["x"] = key.X, ["y"] = key.Y, [field] = "forbidden" };
        Assert.False((await validator.ValidateAsync(Request(Proof(headers: new() { ["jwk"] = JsonSerializer.SerializeToElement(jwk) })))).IsValid);
    }

    [Fact]
    public async Task ChallengesMissingApiNonceAndKeepsEndpointNoncesSeparate()
    {
        var request = Request(Proof());
        Assert.Equal("use_dpop_nonce", (await validator.ValidateAsync(request with { Nonce = validator.InventoryNonce })).Error);
        Assert.NotEqual(validator.AuthorizationNonce, validator.OrdersNonce);
        Assert.NotEqual(validator.InventoryNonce, validator.OrdersNonce);
        var claims = new Dictionary<string, object> { ["nonce"] = "" };
        Assert.Equal("use_dpop_nonce", (await validator.ValidateAsync(Request(Proof(claims)))).Error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not.a.jwt")]
    [InlineData("a.b")]
    public async Task RejectsMalformedProofs(string proof) =>
        Assert.False((await validator.ValidateAsync(Request(proof))).IsValid);

    [Fact]
    public void ResourceGrantsDoNotConfuseScopesOrSiblingResources()
    {
        Assert.True(DemoResources.AreGranted([DemoResources.Orders], [DemoResources.Orders, DemoResources.Inventory]));
        Assert.False(DemoResources.AreGranted([DemoResources.Inventory], [DemoResources.Orders]));
        Assert.False(DemoResources.AreGranted(["orders.read"], [DemoResources.Orders]));
    }

    public void Dispose() => signingKey.Dispose();
}
