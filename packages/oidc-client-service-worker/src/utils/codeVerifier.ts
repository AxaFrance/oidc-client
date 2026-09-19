export function replaceCodeVerifier(codeVerifier: string, newCodeVerifier: string): string {
  const regex = /[?&]code_verifier=([^&]+)/i;
  return codeVerifier.replace(regex, `&code_verifier=${newCodeVerifier}`);
}

export const extractConfigurationNameFromCodeVerifier = (body: string): string => {
  const regex = /[?&]code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_([^&]+)/;
  const match = body.match(regex);

  return match ? decodeURIComponent(match[1]) : '';
};
