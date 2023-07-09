import { describe, it, expect } from 'vitest';
import {replaceCodeVerifier} from "../codeVerifier";

describe('replaceCodeVerifier should', () => {
    it('inject new codeVerifier', () => {
        const body : string = 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback&code_verifier=ONskPfcbfAYPp5xqhpMstHSz017896R7sy3wqrRdqC8lYB8yQciCCNLooqLC9qHFTF2FFhDQP4m8PEFNSry8eoCbQ9baYcoWjF1bEH6vGWExdTIMqauicjeVxqz58FO8';
        const bodyExpected : string = 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback&code_verifier=1234';

        const result  = replaceCodeVerifier(body, '1234');
        expect(bodyExpected).toEqual(result);
    });

    it('inject new codeVerifier', () => {
        const body : string = 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&code_verifier=ONskPfcbfAYPp5xqhpMstHSz017896R7sy3wqrRdqC8lYB8yQciCCNLooqLC9qHFTF2FFhDQP4m8PEFNSry8eoCbQ9baYcoWjF1bEH6vGWExdTIMqauicjeVxqz58FO8&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback';
        const bodyExpected : string = 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&code_verifier=1234&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback';

        const result  = replaceCodeVerifier(body, '1234');
        expect(bodyExpected).toEqual(result);
    });
});