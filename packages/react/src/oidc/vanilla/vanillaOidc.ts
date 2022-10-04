import {Oidc, OidcConfiguration, StringMap} from "./oidc";
import {isTokensValid} from "./parseTokens";
import {sleepAsync} from "./initWorker";
import {Tokens} from "./parseTokens";

export class VanillaOidc {
    private _oidc: Oidc;
    constructor(oidc: Oidc) {
        this._oidc = oidc;
    }
    subscriveEvents(func:Function){
        return this._oidc.subscriveEvents(func);
    }
    removeEventSubscription(id:string){
        this._oidc.removeEventSubscription(id);
    }
    publishEvent(eventName:string, data:any){
        this._oidc.publishEvent(eventName, data);
    }
    static getOrCreate(configuration:OidcConfiguration, name:string="default") {
        return new VanillaOidc(Oidc.getOrCreate(configuration, name));
    }
    static get(name:string="default") {
        return new VanillaOidc(Oidc.get(name));
    }
    static eventNames = Oidc.eventNames;
    tryKeepExistingSessionAsync():Promise<void>{
        return this._oidc.tryKeepExistingSessionAsync();
    }
    loginAsync(callbackPath:string=undefined, extras:StringMap=null, isSilentSignin:boolean=false, scope:string=undefined, silentLoginOnly = false){
        return this._oidc.loginAsync(callbackPath, extras, isSilentSignin, scope, silentLoginOnly);
    }
    logoutAsync(callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null):Promise<void> {
        return this._oidc.logoutAsync(callbackPathOrUrl, extras);
    }
    silentLoginCallbackAsync():Promise<any>{
        return this._oidc.silentLoginCallbackAsync();
    };
    renewTokensAsync(extras:StringMap=null):Promise<any> {
        return this._oidc.renewTokensAsync(extras);
    }
    loginCallbackAsync():Promise<any>{
        return this._oidc.loginCallbackWithAutoTokensRenewAsync();
    }
    get tokens():Tokens {
        return this._oidc.tokens;
    }
    get configuration():OidcConfiguration {
        return this._oidc.configuration;
    }
    async getValidTokenAsync(waitMs=200, numberWait=50 ) {
        const oidc = this._oidc;
        let numberWaitTemp = numberWait;
        while (oidc.tokens && !isTokensValid(oidc.tokens) && numberWaitTemp > 0) {
            await sleepAsync(200);
            numberWaitTemp=numberWaitTemp-1;
        }
        const isValid = !isTokensValid(oidc.tokens);
        return { 
            isTokensValid: isValid, 
            tokens: oidc.tokens,
            numberWaited: numberWaitTemp - numberWait
        };
    }
    async userInfoAsync():Promise<any>{
        return this._oidc.userInfoAsync();
    }
}