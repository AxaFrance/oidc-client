import { excludeOs, getOperatingSystem } from './initWorker';

test.each([['Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1', 'iOS', '12.1.0'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/69.0.3497.105 Mobile/15E148 Safari/605.1', 'Mac OS X', '10_15_6'],
])(
    'getOperatingSystem should return OS for Version',
    (userAgent, expectedOs, expectedVersion) => {
        const operatingSystem = getOperatingSystem({ userAgent, appVersion: 'OS ' + expectedVersion.replaceAll('.', '_') });
        expect(expectedOs).toBe(operatingSystem.os);
        expect(expectedVersion).toBe(operatingSystem.osVersion);

        const isExcluded = excludeOs(operatingSystem);
        expect(isExcluded).toBe(true);
    },
);
