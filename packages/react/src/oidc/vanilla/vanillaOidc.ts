import { LoginCallback, Oidc } from './oidc.js';
import { getValidTokenAsync, Tokens, ValidToken } from './parseTokens.js';
import { OidcConfiguration, StringMap } from './types.js';

export interface EventSubscriber {
    (name: string, data:any);
}

export class VanillaOidc {
    private _oidc: Oidc;
    constructor(oidc: Oidc) {
        this._oidc = oidc;
    }

    subscribeEvents(func:EventSubscriber):string {
        return this._oidc.subscribeEvents(func);
    }

    removeEventSubscription(id:string):void {
        this._oidc.removeEventSubscription(id);
    }

    publishEvent(eventName:string, data:any) : void {
        this._oidc.publishEvent(eventName, data);
    }

    static getOrCreate(configuration:OidcConfiguration, name = 'default'):VanillaOidc {
        return new VanillaOidc(Oidc.getOrCreate(configuration, name));
    }

    static get(name = 'default'):VanillaOidc {
        return new VanillaOidc(Oidc.get(name));
    }

    static eventNames = Oidc.eventNames;
    tryKeepExistingSessionAsync():Promise<boolean> {
        return this._oidc.tryKeepExistingSessionAsync();
    }

    loginAsync(callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined, silentLoginOnly = false):Promise<void> {
        return this._oidc.loginAsync(callbackPath, extras, isSilentSignin, scope, silentLoginOnly);
    }

    logoutAsync(callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null):Promise<void> {
        return this._oidc.logoutAsync(callbackPathOrUrl, extras);
    }

    silentLoginCallbackAsync():Promise<void> {
        return this._oidc.silentLoginCallbackAsync();
    }

    renewTokensAsync(extras:StringMap = null):Promise<void> {
        return this._oidc.renewTokensAsync(extras);
    }

    loginCallbackAsync():Promise<LoginCallback> {
        return this._oidc.loginCallbackWithAutoTokensRenewAsync();
    }

    get tokens():Tokens {
        return this._oidc.tokens;
    }

    get configuration():OidcConfiguration {
        return this._oidc.configuration;
    }

    async getValidTokenAsync(waitMs = 200, numberWait = 50): Promise<ValidToken> {
        return getValidTokenAsync(this._oidc, waitMs, numberWait);
    }

    async userInfoAsync<T extends OidcUserInfo = OidcUserInfo>():Promise<T> {
        return this._oidc.userInfoAsync();
    }
}

export interface OidcUserInfo {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    middle_name?: string;
    nickname?: string;
    preferred_username?: string;
    profile?: string;
    picture?: string;
    website?: string;
    email?: string;
    email_verified?: boolean;
    gender?: string;
    birthdate?: string;
    zoneinfo?: string;
    locale?: string;
    phone_number?: string;
    phone_number_verified?: boolean;
    address?: OidcAddressClaim;
    updated_at?: number;
    groups?: string[];
}

export interface OidcAddressClaim {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
}
