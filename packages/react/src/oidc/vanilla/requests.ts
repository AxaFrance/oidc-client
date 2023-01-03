import { parseOriginalTokens } from './parseTokens';

const internalFetch = async (url, headers, numberRetry = 0, timeoutMs = 10000) => {
    let response;
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeoutMs);
        response = await fetch(url, { ...headers, signal: controller.signal });
    } catch (e) {
        if (e.message === 'AbortError' ||
            e.message === 'Network request failed') {
            if (numberRetry <= 1) {
                return await internalFetch(url, headers, numberRetry + 1, timeoutMs);
            } else {
                throw e;
            }
        } else {
            console.error(e.message);
            throw e; // rethrow other unexpected errors
        }
    }
    return response;
};

export const TOKEN_TYPE = {
    refresh_token: 'refresh_token',
    access_token: 'access_token',
};

export const performRevocationRequestAsync = async (url, token, token_type = TOKEN_TYPE.refresh_token, client_id, timeoutMs = 10000) => {
    const details = {
        token,
        token_type_hint: token_type,
        client_id,
    };

    const formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false };
    }
    return {
        success: true,
    };
};

export const performTokenRequestAsync = async (url, details, extras, oldTokens, tokenRenewMode: string, timeoutMs = 10000) => {
    for (const [key, value] of Object.entries(extras)) {
        if (details[key] === undefined) {
            details[key] = value;
        }
    }

    const formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false, status: response.status };
    }
    const tokens = await response.json();
    return {
        success: true,
        data: parseOriginalTokens(tokens, oldTokens, tokenRenewMode),
    };
};
