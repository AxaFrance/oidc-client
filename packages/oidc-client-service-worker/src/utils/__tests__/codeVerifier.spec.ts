import { describe, expect, it } from 'vitest';

import { extractConfigurationNameFromCodeVerifier, replaceCodeVerifier } from '../codeVerifier';

describe('replaceCodeVerifier should', () => {
  it.each([
    ['?code_verifier=old&state=example', '&code_verifier=new&state=example'],
    ['&CODE_VERIFIER=old', '&code_verifier=new'],
    ['&code_verifier=first&code_verifier=second', '&code_verifier=new&code_verifier=second'],
    ['code_verifier=old', 'code_verifier=old'],
    ['&code_verifier=&state=example', '&code_verifier=&state=example'],
    ['&other=example', '&other=example'],
    ['', ''],
  ])('preserve replacement boundaries for %s', (body, expected) => {
    expect(replaceCodeVerifier(body, 'new')).toBe(expected);
  });

  it.each([
    {
      body: 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback&code_verifier=ONskPfcbfAYPp5xqhpMstHSz017896R7sy3wqrRdqC8lYB8yQciCCNLooqLC9qHFTF2FFhDQP4m8PEFNSry8eoCbQ9baYcoWjF1bEH6vGWExdTIMqauicjeVxqz58FO8',
      bodyExpected:
        'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback&code_verifier=1234',
    },
    {
      body: 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&code_verifier=ONskPfcbfAYPp5xqhpMstHSz017896R7sy3wqrRdqC8lYB8yQciCCNLooqLC9qHFTF2FFhDQP4m8PEFNSry8eoCbQ9baYcoWjF1bEH6vGWExdTIMqauicjeVxqz58FO8&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback',
      bodyExpected:
        'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&code_verifier=1234&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback',
    },
  ])('inject new codeVerifier', async ({ body, bodyExpected }) => {
    const result = replaceCodeVerifier(body, '1234');
    expect(bodyExpected).toEqual(result);
  });
});

describe('extractConfigurationNameFromCodeVerifier should', () => {
  it.each([
    ['?code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_team%20one&state=x', 'team one'],
    ['&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_team%23tab', 'team#tab'],
    ['&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_team+one', 'team+one'],
    ['code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_default', ''],
    ['&CODE_VERIFIER=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_default', ''],
    ['&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_', ''],
    ['&code_verifier=ordinary', ''],
    ['', ''],
  ])('preserve extraction boundaries and decoding for %s', (body, expected) => {
    expect(extractConfigurationNameFromCodeVerifier(body)).toBe(expected);
  });

  it('preserve malformed configuration escape errors', () => {
    expect(() =>
      extractConfigurationNameFromCodeVerifier(
        '&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_%ZZ',
      ),
    ).toThrow(URIError);
  });

  it.each([
    {
      body: 'code=56DB8E3592FBD48DCF6F65B38B12845FF0186ECF6D66ECB5425C0F7E658B7951-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=https%3A%2F%2Fblack-rock-0dc6b0d03.1.azurestaticapps.net%2Fauthentication%2Fcallback&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_default_tab1',
      expected: 'default_tab1',
    },
    {
      body: 'code=56DB8E3592FBD48DCF6F65B38B12845FF0186ECF6D66ECB5425C0F7E658B7951-1&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_youhou_tab2&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=https%3A%2F%2Fblack-rock-0dc6b0d03.1.azurestaticapps.net%2Fauthentication%2Fcallback',
      expected: 'youhou_tab2',
    },
  ])('inject new codeVerifier', async ({ body, expected }) => {
    const configurationName = extractConfigurationNameFromCodeVerifier(body);
    expect(configurationName).toEqual(expected);
  });
});
