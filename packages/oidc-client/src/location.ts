export interface ILOidcLocation {
    open(url:string):void;
}

export class OidcLocation implements ILOidcLocation {
    open(url:string) {
        window.open(url, '_self');
        //window.location.href = url;
    }
}
