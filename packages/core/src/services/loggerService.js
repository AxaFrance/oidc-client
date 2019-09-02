import { Log } from 'oidc-client';

let oidcLogLevel = Log.DEBUG;
let oidcLogger = console;

export const setLogger = (level, logger) => {
  const validOidcClientLevels = [
    Log.DEBUG, // 4
    Log.INFO, // 3
    Log.WARN, // 2
    Log.ERROR, // 1
    Log.NONE, // 0
  ];

  if (validOidcClientLevels.indexOf(level) === -1) {
    const levels = validOidcClientLevels.join(', ');
    const msg = `The log level must be one of ${levels}`;
    throw new RangeError(msg);
  }

  oidcLogLevel = level;
  oidcLogger = logger;
  Log.level = level;
  Log.logger = logger;
};

const debug = (...msg) => {
  if (oidcLogLevel >= Log.DEBUG) {
    oidcLogger.debug('DEBUG [react-context-oidc] :', ...msg);
  }
};

const info = (...msg) => {
  if (oidcLogLevel >= Log.INFO) {
    oidcLogger.info('INFO [react-context-oidc] :', ...msg);
  }
};

const warn = (...msg) => {
  if (oidcLogLevel >= Log.WARN) {
    oidcLogger.warn('WARN [react-context-oidc] :', ...msg);
  }
};

const error = (...msg) => {
  if (oidcLogLevel >= Log.ERROR) {
    oidcLogger.error('ERROR [react-context-oidc] :', ...msg);
  }
};

export const oidcLog = {
  debug,
  info,
  warn,
  error,
  ERROR: Log.ERROR,
  WARN: Log.WARN,
  INFO: Log.INFO,
  NONE: Log.NONE,
  DEBUG: Log.DEBUG,
};
