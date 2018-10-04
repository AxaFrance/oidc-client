import { Log } from "oidc-client";

let _level = Log.DEBUG;
let _logger = console;

export const setLogger = (level, logger) => {
  const validOidcClientLevels = [
    Log.DEBUG, // 4
    Log.INFO, // 3
    Log.WARN, // 2
    Log.ERROR, // 1
    Log.NONE // 0
  ];

  if (validOidcClientLevels.indexOf(level) === -1) {
    const levels = validOidcClientLevels.join(", ");
    const msg = `The log level must be one of ${levels}`;
    throw new RangeError(msg);
  }

  _level = level;
  _logger = logger;
  Log.level = level;
  Log.logger = logger;
};

const debug = (...msg) => {
  if (_level >= Log.DEBUG) {
    _logger.debug("DEBUG [react-context-oidc] :", ...msg);
  }
};

const info = (...msg) => {
  if (_level >= Log.INFO) {
    _logger.info("INFO [react-context-oidc] :", ...msg);
  }
};

const warn = (...msg) => {
  if (_level >= Log.WARN) {
    _logger.warn("WARN [react-context-oidc] :", ...msg);
  }
};

const error = (...msg) => {
  if (_level >= Log.ERROR) {
    _logger.error("ERROR [react-context-oidc] :", ...msg);
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
  DEBUG: Log.DEBUG
};
