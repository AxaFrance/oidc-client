import {BasicQueryStringUtils} from '@openid/appauth';

export class NoHashQueryStringUtils extends BasicQueryStringUtils {
    parse(input, useHash) {
        return super.parse(input, false /* never use hash */);
    }
}
