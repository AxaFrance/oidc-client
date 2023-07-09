

export function replaceCodeVerifier(codeVerifier:string, newCodeVerifier:string):string {
    const regex = /code_verifier=[A-Za-z0-9_-]+/i;
    const replacedString = codeVerifier.replace(regex, `code_verifier=${newCodeVerifier}`);

    return replacedString;
}