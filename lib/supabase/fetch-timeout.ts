import "server-only";

/**
 * A fetch that gives up rather than hanging.
 *
 * Supabase's own client has no request timeout, so when the hosted project is
 * unreachable the platform's edge holds the connection for ~22 seconds before
 * returning 522. Every page in the OS reads from the database, so that turns one
 * bad request into a 22-second blank screen. Failing at 8 seconds lets the error
 * boundary render something useful while the person still has patience.
 *
 * 8s is well clear of a healthy request here (400–900ms) and of a cold start.
 */
const TIMEOUT_MS = 8_000;

export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Respect a caller's own signal (Next.js passes one for request cancellation).
  const signals = [AbortSignal.timeout(TIMEOUT_MS)];
  if (init?.signal) signals.push(init.signal);

  return fetch(input, { ...init, signal: AbortSignal.any(signals) }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(`The database did not respond within ${TIMEOUT_MS / 1000} seconds (request timed out).`);
    }
    throw error;
  });
}

export { TIMEOUT_MS };
