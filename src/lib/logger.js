// DEV-gated logger.
//
// In production builds (`import.meta.env.PROD`) these become no-ops, so we never
// ship `console.log`/`console.debug` statements that could leak request payloads
// or PII to the browser console. `error` is always emitted so real failures are
// still visible in production.
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  // Always surfaced — production failures should remain observable.
  error: (...args) => {
    console.error(...args);
  },
};

export default logger;
