import { ServiceWorkerActivate } from './types';

export const excludeOs = (operatingSystem): boolean => {
  // Exclure tous les OS Apple
  return ['iOS', 'Mac OS', 'Mac OS X'].includes(operatingSystem.os);
};

export const getOperatingSystem = (navigator): { os: string; osVersion: string } => {
  const nVer = navigator.appVersion;
  const nAgt = navigator.userAgent;
  const unknown = '-';
  let os = unknown;
  const clientStrings = [
    { s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/ },
    { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
    { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
    { s: 'Windows Vista', r: /Windows NT 6.0/ },
    { s: 'Windows Server 2003', r: /Windows NT 5.2/ },
    { s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/ },
    { s: 'Windows 2000', r: /(Windows NT 5.0|Windows 2000)/ },
    { s: 'Windows ME', r: /(Win 9x 4.90|Windows ME)/ },
    { s: 'Windows 98', r: /(Windows 98|Win98)/ },
    { s: 'Windows 95', r: /(Windows 95|Win95|Windows_95)/ },
    { s: 'Windows NT 4.0', r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/ },
    { s: 'Windows CE', r: /Windows CE/ },
    { s: 'Windows 3.11', r: /Win16/ },
    { s: 'Android', r: /Android/ },
    { s: 'Open BSD', r: /OpenBSD/ },
    { s: 'Sun OS', r: /SunOS/ },
    { s: 'Chrome OS', r: /CrOS/ },
    { s: 'Linux', r: /(Linux|X11(?!.*CrOS))/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'QNX', r: /QNX/ },
    { s: 'UNIX', r: /UNIX/ },
    { s: 'BeOS', r: /BeOS/ },
    { s: 'OS/2', r: /OS\/2/ },
    { s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/ },
  ];

  for (const cs of clientStrings) {
    if (cs.r.test(nAgt)) {
      os = cs.s;
      break;
    }
  }

  let osVersion = unknown;

  if (/Windows/.test(os)) {
    osVersion = /Windows (.*)/.exec(os)?.[1] ?? unknown;
    os = 'Windows';
  }

  switch (os) {
    case 'Mac OS':
    case 'Mac OS X':
    case 'Android':
      osVersion =
        /(?:Android|Mac OS|Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh) ([._\d]+)/.exec(nAgt)?.[1] ?? unknown;
      break;
    case 'iOS': {
      const osVersionArray = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
      if (osVersionArray != null && osVersionArray.length > 2) {
        osVersion = `${osVersionArray[1]}.${osVersionArray[2]}.${parseInt(osVersionArray[3]) || 0}`;
      }
      break;
    }
  }

  return { os, osVersion };
};

function getBrowser(): { name: string; version: string } {
  const ua = navigator.userAgent;
  let tem;
  let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return { name: 'ie', version: tem[1] || '' };
  }
  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edg)\/(\d+)/);
    if (tem != null) {
      return { name: tem[1] === 'OPR' ? 'opera' : 'edge', version: tem[2] };
    }
  }
  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) {
    M.splice(1, 1, tem[1]);
  }
  return {
    name: M[0].toLowerCase(),
    version: M[1],
  };
}

export const activateServiceWorker: ServiceWorkerActivate = (): boolean => {
  const { name: browserName, version: browserVersion } = getBrowser();

  // Éventuel fallback si des versions spécifiques posent problème
  if (browserName === 'chrome' && parseInt(browserVersion) <= 70) {
    return false;
  }
  if (browserName === 'opera' && (!browserVersion || parseInt(browserVersion.split('.')[0]) < 80)) {
    return false;
  }
  if (browserName === 'ie') {
    return false;
  }

  // Bloquer toutes les machines Apple
  const operatingSystem = getOperatingSystem(navigator);
  return !excludeOs(operatingSystem);
};
