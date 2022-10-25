import { BasicQueryStringUtils, LocationLike } from '@openid/appauth';

export class NoHashQueryStringUtils extends BasicQueryStringUtils {
    parse(input: LocationLike, _useHash: boolean) {
        return super.parse(input, false /* never use hash */);
    }
}

const keys = ['code', 'session_state', 'state'];

export class HashQueryStringUtils extends BasicQueryStringUtils {
    parse(input: LocationLike, _useHash: boolean) {
        const output = super.parse(input, true /* use hash */);

        // Fix AppAuthJs behavior
        let propertyToDelelete = null;
        Object.entries(output).forEach(([key, value]) => {
            keys.forEach(k => {
                if (key.endsWith(`?${k}`)) {
                    output[k] = value;
                    propertyToDelelete = key;
                }
            });
        });

        if (propertyToDelelete) {
            delete output[propertyToDelelete];
        }

        return output;
    }
}
