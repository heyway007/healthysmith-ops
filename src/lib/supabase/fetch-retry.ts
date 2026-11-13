/**
 * `fetch` for the server-side Supabase clients.
 *
 * From this office's network, opening many connections to Supabase at once
 * fails often: measured 2026-11-13, 15 parallel requests saw ~20% ECONNRESET
 * plus the odd 10-second connect timeout, while the same requests run at most
 * 4 at a time almost never failed (45 requests: 34s with 12 failures -> 2.8s
 * with 1). A page render fires many queries together, so unchecked this showed
 * up as random sign-outs and "fetch failed" pages.
 *
 * So this wrapper:
 *  1. lets at most MAX_PARALLEL requests run at once per server process (the
 *     rest wait their turn, which also lets Node reuse open connections), and
 *  2. retries a request whose connection failed, with a growing delay:
 *     - GET/HEAD on any network error (reads are safe to repeat);
 *     - writes only when the connection was never made (refused / DNS /
 *       connect timeout). A reset mid-write is not retried, because the
 *       database may already have applied it.
 */
const MAX_PARALLEL = 4;
const RETRIES = 3;
const NEVER_CONNECTED = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"]);

let active = 0;
const waiting: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_PARALLEL) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next(); // hand the slot straight to the next request
  else active--;
}

function errorCode(err: unknown): string | undefined {
  const cause = (err as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (err as { code?: string })?.code;
}

export const fetchWithRetry: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isRead = method === "GET" || method === "HEAD";

  for (let attempt = 0; ; attempt++) {
    await acquire();
    try {
      return await fetch(input, init);
    } catch (err) {
      const code = errorCode(err);
      const retryable = isRead || (code !== undefined && NEVER_CONNECTED.has(code));
      if (attempt >= RETRIES || !retryable || init?.signal?.aborted) {
        console.warn(`[supabase] ${method} failed after ${attempt + 1} attempt(s): ${code ?? (err as Error)?.message}`);
        throw err;
      }
    } finally {
      release();
    }
    await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt + Math.random() * 100));
  }
};
