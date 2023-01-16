import {performAuthorizationRequestAsync} from "./requests";

test('performAuthorizationRequestAsync', async () => {
    const test = await performAuthorizationRequestAsync();

    expect(test).toBe(true);
});