export function replaceCodeVerifier(codeVerifier:string, newCodeVerifier:string):string {
    const regex = /code_verifier=[A-Za-z0-9_-]+/i;
    return codeVerifier.replace(regex, `code_verifier=${newCodeVerifier}`);
}

export const extractConfigurationNameFromCodeVerifier = (chaine:string):string | null => {
    const regex = /CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_([^&\s]+)/;
    const result = chaine.match(regex);

    if (result && result.length > 1) {
        return result[1];
    } else {
        return null;
    }
}
