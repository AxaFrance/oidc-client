using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore;
using Microsoft.IdentityModel.Tokens;
using OpenIddict.Server;
using OpenIddict.Server.AspNetCore;

namespace OpenIddictDemo;

internal static class DemoSession
{
    public const string CookieName = "openiddict-demo-browser";

    public static void AttachState(OpenIddictServerEvents.ProcessSignInContext context)
    {
        if (context.EndpointType != OpenIddictServerEndpointType.Authorization ||
            context.Request.RedirectUri is not { } redirect)
            return;
        var request = context.Transaction.GetHttpRequest();
        if (request?.Cookies[CookieName] is not { } state) return;
        var salt = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(16));
        context.Response["session_state"] = Calculate(context.Request.ClientId!, new Uri(redirect).GetLeftPart(UriPartial.Authority), state, salt);
    }

    public static string Calculate(string clientId, string origin, string state, string salt) =>
        Base64UrlEncoder.Encode(SHA256.HashData(Encoding.UTF8.GetBytes($"{clientId} {origin} {state} {salt}"))) + "." + salt;

    public const string Script = """
        const origins = new Set(['http://localhost:5173', 'http://localhost:5174']);
        window.addEventListener('message', async event => {
          if (!origins.has(event.origin) || typeof event.data !== 'string') return;
          const [clientId, sessionState] = event.data.split(' ');
          if (!['interactive.public.short', 'local.google'].includes(clientId) || !sessionState?.includes('.')) return;
          const salt = sessionState.split('.')[1];
          const cookie = document.cookie.split('; ').find(value => value.startsWith('openiddict-demo-browser='));
          const state = cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
          const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${clientId} ${event.origin} ${state} ${salt}`));
          const encoded = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          event.source.postMessage(`${encoded}.${salt}` === sessionState ? 'unchanged' : 'changed', event.origin);
        });
        """;
}
