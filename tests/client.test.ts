// tests/client.test.ts — v0.2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RecurrenteClient, RecurrenteError } from "../src/client.js";

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<Parameters<typeof RecurrenteClient.prototype.constructor>[0]> = {}) {
  return new RecurrenteClient({
    publicKey: "pk_test",
    secretKey: "sk_test",
    ...overrides,
  });
}

function mockFetch(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const r = responses[Math.min(call++, responses.length - 1)];
    return Promise.resolve({
      ok:      r.status < 400,
      status:  r.status,
      headers: {
        get: (h: string) => (r.headers ?? {})[h] ?? null,
      },
      json: () => Promise.resolve(r.body ?? {}),
    });
  });
}

// ── Retry behavior ────────────────────────────────────────────────────────────

describe("RecurrenteClient — retry logic", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it("succeeds on first attempt without retrying", async () => {
    const f = mockFetch([{ status: 200, body: { id: "ch_1" } }]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient();
    const result = await client.request<{ id: string }>({ method: "GET", path: "/api/checkouts/ch_1" });
    expect(result.id).toBe("ch_1");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries 429 up to maxRetries then throws RecurrenteError", async () => {
    const f = mockFetch([
      { status: 429, body: { message: "Rate limit" } },
      { status: 429, body: { message: "Rate limit" } },
      { status: 429, body: { message: "Rate limit" } },
      { status: 429, body: { message: "Rate limit" } },
    ]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ maxRetries: 3 });
    await expect(client.request({ method: "GET", path: "/api/test" }))
      .rejects.toThrow(RecurrenteError);
    expect(f).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 10000);

  it("retries 500 and succeeds on second attempt", async () => {
    const f = mockFetch([
      { status: 500, body: { message: "Server error" } },
      { status: 200, body: { ok: true } },
    ]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ maxRetries: 3 });
    const result = await client.request<{ ok: boolean }>({ method: "GET", path: "/api/test" });
    expect(result.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry 400 errors", async () => {
    const f = mockFetch([{ status: 400, body: { message: "Bad request" } }]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ maxRetries: 3 });
    await expect(client.request({ method: "POST", path: "/api/checkouts", body: {} }))
      .rejects.toThrow(RecurrenteError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("throws RecurrenteError with correct statusCode and message", async () => {
    const f = mockFetch([{ status: 404, body: { message: "Not found" } }]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ maxRetries: 0 });
    try {
      await client.request({ method: "GET", path: "/api/checkouts/invalid" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RecurrenteError);
      const e = err as RecurrenteError;
      expect(e.statusCode).toBe(404);
      expect(e.message).toBe("Not found");
    }
  });

  it("sends correct auth headers", async () => {
    const f = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ publicKey: "pk_123", secretKey: "sk_456" });
    await client.request({ method: "GET", path: "/api/test" });

    const [, init] = f.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-PUBLIC-KEY"]).toBe("pk_123");
    expect(headers["X-SECRET-KEY"]).toBe("sk_456");
  });

  // ── Idempotency key ─────────────────────────────────────────────────────────

  it("sends Idempotency-Key header on POST requests", async () => {
    const f = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient();
    await client.request({ method: "POST", path: "/api/checkouts", body: {} });

    const [, init] = f.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBeTruthy();
    // UUID format
    expect(headers["Idempotency-Key"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("reuses the same Idempotency-Key across retry attempts", async () => {
    const f = mockFetch([
      { status: 503, body: { message: "Service unavailable" } },
      { status: 200, body: {} },
    ]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ maxRetries: 1 });
    await client.request({ method: "POST", path: "/api/checkouts", body: {} });

    expect(f).toHaveBeenCalledTimes(2);
    const key1 = (f.mock.calls[0]![1] as RequestInit & { headers: Record<string, string> }).headers["Idempotency-Key"];
    const key2 = (f.mock.calls[1]![1] as RequestInit & { headers: Record<string, string> }).headers["Idempotency-Key"];
    expect(key1).toBe(key2);
  });

  it("does NOT send Idempotency-Key on GET requests", async () => {
    const f = mockFetch([{ status: 200, body: {} }]);
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient();
    await client.request({ method: "GET", path: "/api/checkouts/ch_1" });

    const [, init] = f.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBeUndefined();
  });

  // ── Timeout ─────────────────────────────────────────────────────────────────

  it("throws RecurrenteError when request times out", async () => {
    // Simulate a fetch that never resolves until aborted
    const f = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    globalThis.fetch = f as unknown as typeof fetch;

    const client = makeClient({ timeout: 50, maxRetries: 0 });

    await expect(
      client.request({ method: "GET", path: "/api/test" }),
    ).rejects.toThrow(/timed out/i);
  });
});
