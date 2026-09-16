/**
 * Structured logger. In production this is the single hook for Sentry breadcrumbs/events.
 * Never pass tokens, cookies, emails or document content in `fields`.
 */
type Fields = Record<string, unknown>;

function emit(level: "debug" | "info" | "warn" | "error", event: string, fields?: Fields) {
  const line = { level, event, time: new Date().toISOString(), ...fields };
  if (level === "error") console.error(JSON.stringify(line));
  else if (level === "warn") console.warn(JSON.stringify(line));
  else if (process.env.NODE_ENV !== "production") console.log(JSON.stringify(line));
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit("debug", event, fields),
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};
