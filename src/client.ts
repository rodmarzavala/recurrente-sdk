// ─────────────────────────────────────────────────────────────────────────────
// src/client.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { RecurrenteClientOptions, RecurrenteErrorBody } from "./types/index.js";

// ── Error class ───────────────────────────────────────────────────────────────

/**
 * Represents an error returned by the Recurrente API.
 * Includes the HTTP status code and the parsed error body.
 */
export class RecurrenteError extends Error {
  readonly statusCode: number;
  readonly body: RecurrenteErrorBody;

  constructor(message: string, statusCode: number, body: RecurrenteErrorBody) {
    super(message);
    this.name = "RecurrenteError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Type guard to check if an error is a RecurrenteError.
 * 
 * @param error - The error to check
 * @returns True if the error is an instance of RecurrenteError
 * @example
 * try {
 *   await recurrente.checkouts.create(data);
 * } catch (error) {
 *   if (isRecurrenteError(error)) {
 *     console.error(error.statusCode, error.body.message);
 *   }
 * }
 */
export function isRecurrenteError(error: unknown): error is RecurrenteError {
  return error instanceof RecurrenteError;
}

// ── Internal request options ──────────────────────────────────────────────────

export interface InternalRequestOptions {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  /** Use only X-PUBLIC-KEY (safe for checkout creation from frontend) */
  publicOnly?: boolean | undefined;
  /** Override idempotency key for this request */
  idempotencyKey?: string | undefined;
  /** Response carries pagination headers — pass the Response back */
  returnResponse?: boolean;
  /** Per-request timeout override (ms) */
  timeout?: number | undefined;
}

// ── Retry helpers ─────────────────────────────────────────────────────────────

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const DEFAULT_TIMEOUT  = 30_000; // 30 s

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return retryAfterMs;
  const base = Math.min(1_000 * 2 ** attempt, 30_000);
  return Math.random() * base;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class RecurrenteClient {
  private readonly publicKey:  string;
  private readonly secretKey:  string;
  private readonly baseUrl:    string;
  private readonly maxRetries: number;
  private readonly timeout:    number;

  constructor(options: RecurrenteClientOptions) {
    this.publicKey  = options.publicKey;
    this.secretKey  = options.secretKey;
    this.baseUrl    = options.baseUrl?.replace(/\/$/, "") ?? "https://app.recurrente.com";
    this.maxRetries = options.maxRetries ?? 3;
    this.timeout    = options.timeout ?? DEFAULT_TIMEOUT;
  }

  // ── Public request method ─────────────────────────────────────────────────

  async request<T>(options: InternalRequestOptions): Promise<T> {
    const { method, path, body, publicOnly, returnResponse } = options;

    // Generate idempotency key once — reused across all retry attempts
    const idempotencyKey =
      options.idempotencyKey ??
      (MUTATING_METHODS.has(method) ? crypto.randomUUID() : undefined);

    const timeoutMs = options.timeout ?? this.timeout;

    let attempt = 0;

    while (true) {
      const headers: Record<string, string> = {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "X-PUBLIC-KEY":  this.publicKey,
      };

      if (!publicOnly) {
        headers["X-SECRET-KEY"] = this.secretKey;
      }

      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }

      // Build AbortSignal for timeout
      let signal: AbortSignal | null = null;
      let timerId: ReturnType<typeof setTimeout> | undefined;

      if (timeoutMs > 0) {
        const controller = new AbortController();
        signal = controller.signal;
        timerId = setTimeout(() => controller.abort(), timeoutMs);
      }

      let response: Response;

      try {
        const init: RequestInit = {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : null,
          signal,
        };

        response = await fetch(`${this.baseUrl}${path}`, init);
      } catch (err) {
        if (timerId !== undefined) clearTimeout(timerId);

        // Abort = timeout
        if (err instanceof Error && err.name === "AbortError") {
          throw new RecurrenteError(
            `Request timed out after ${timeoutMs}ms`,
            0,
            { message: `Request timed out after ${timeoutMs}ms` },
          );
        }
        throw err;
      } finally {
        if (timerId !== undefined) clearTimeout(timerId);
      }

      // Success
      if (response.ok) {
        if (returnResponse) {
          // Caller needs the raw Response to read headers
          return response as unknown as T;
        }
        return response.json() as Promise<T>;
      }

      // Retryable error?
      if (RETRYABLE_STATUS.has(response.status) && attempt < this.maxRetries) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterMs = retryAfterHeader
          ? parseFloat(retryAfterHeader) * 1_000
          : undefined;

        await sleep(jitteredBackoff(attempt, retryAfterMs));
        attempt++;
        continue;
      }

      // Non-retryable or exhausted retries
      const errorBody = await response.json().catch(() => ({ message: response.statusText })) as RecurrenteErrorBody;
      throw new RecurrenteError(errorBody.message ?? response.statusText, response.status, errorBody);
    }
  }
}
