export function replaceCodeVerifier(codeVerifier: string, newCodeVerifier: string): string {
  const regex = /[?&]code_verifier=([^&]+)/i;
  return codeVerifier.replace(regex, `&code_verifier=${newCodeVerifier}`);
}

export const extractConfigurationNameFromCodeVerifier = (chaine: string): string => {
  const regex = /[?&]code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_([^&]+)/;
  const match = chaine.match(regex);

  if (match && match.length > 0) {
    return decodeURIComponent(match[1]);
  } else {
    return '';
  }
};
