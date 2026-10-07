// The fork copies an account from mainnet the first time it is read, and asks mainnet again for one that does not exist
// yet. When mainnet answers slowly or refuses for a moment, the read fails ("failed to get info for accounts") although
// the same read works a second later. Reads are retried once after a short pause, so a passing hiccup never reaches the
// user. Anything that is not a plain read, sending a transaction above all, goes through exactly once.
const RETRY_DELAY_MS = 400;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isReadOnlyRpcBody(body: unknown): boolean {
  if (typeof body !== "string") return false;
  try {
    const parsed: unknown = JSON.parse(body);
    const requests = Array.isArray(parsed) ? parsed : [parsed];
    return requests.length > 0 && requests.every((request) => typeof request?.method === "string" && request.method.startsWith("get"));
  } catch {
    return false;
  }
}

// A JSON-RPC failure arrives with HTTP 200 and an error in the body, a busy server with 429 or 5xx.
function failed(status: number, text: string): boolean {
  if (status === 429 || status >= 500) return true;
  try {
    const parsed: unknown = JSON.parse(text);
    const replies = Array.isArray(parsed) ? parsed : [parsed];
    return replies.some((reply) => reply !== null && typeof reply === "object" && "error" in reply && reply.error != null);
  } catch {
    return false;
  }
}

export function retryingFetch(base: FetchLike = fetch, delayMs = RETRY_DELAY_MS): FetchLike {
  return async (input, init) => {
    if (!isReadOnlyRpcBody(init?.body)) return base(input, init);
    let response: Response;
    try {
      response = await base(input, init);
    } catch {
      await sleep(delayMs);
      return base(input, init);
    }
    // Read from a copy, so the answer itself is handed on unread.
    if (!failed(response.status, await response.clone().text())) return response;
    await sleep(delayMs);
    try {
      return await base(input, init);
    } catch {
      // The retry could not reach the server at all: report the first answer, which says what went wrong.
      return response;
    }
  };
}
