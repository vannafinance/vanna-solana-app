export type ApiErrorKind = "network" | "timeout" | "rate-limited" | "server" | "invalid-response";

const MESSAGES: Record<ApiErrorKind, string> = {
  network: "Can't reach Vanna. Check your connection and try again.",
  timeout: "Vanna took too long to answer. Try again.",
  "rate-limited": "Too many requests right now. Try again in a moment.",
  server: "Vanna couldn't load this right now. Try again.",
  "invalid-response": "Vanna sent data this app can't read. Try again later.",
};

export class ApiError extends Error {
  constructor(readonly kind: ApiErrorKind, readonly status?: number) {
    super(MESSAGES[kind]);
    this.name = "ApiError";
  }
}

type RequestOptions = { signal?: AbortSignal; timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 15_000;

// fetch has no timeout of its own, and a cancelled query must also cancel the request.
export async function requestJson(url: string, { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {}): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (response.status === 429) throw new ApiError("rate-limited", 429);
    if (!response.ok) throw new ApiError("server", response.status);
    try {
      return await response.json();
    } catch {
      throw new ApiError("invalid-response", response.status);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error;
    throw new ApiError(timedOut ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
