// tests/webhooks.test.ts — v0.2.0
import { describe, it, expect } from "vitest";
import { RecurrenteWebhooks } from "../src/modules/webhooks.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeSignedEvent(body: string, msgId: string, tsSeconds: number, rawKey: Uint8Array) {
  const keyBuffer = rawKey.buffer.slice(
    rawKey.byteOffset,
    rawKey.byteOffset + rawKey.byteLength,
  ) as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed    = `${msgId}.${tsSeconds}.${body}`;
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signed));
  const sigB64    = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  const secret    = `whsec_${btoa(String.fromCharCode(...rawKey))}`;

  return {
    secret,
    headers: {
      "svix-id":        msgId,
      "svix-timestamp": String(tsSeconds),
      "svix-signature": `v1,${sigB64}`,
    },
  };
}

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RecurrenteWebhooks.verifySignature", () => {

  it("returns true for a valid signature", async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(24));
    const body   = JSON.stringify({ event_type: "payment_intent.succeeded" });
    const { secret, headers } = await makeSignedEvent(body, "msg_001", nowTs(), rawKey);

    expect(await RecurrenteWebhooks.verifySignature(body, headers, secret)).toBe(true);
  });

  it("returns false when body is tampered", async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(24));
    const body   = JSON.stringify({ amount: 100 });
    const { secret, headers } = await makeSignedEvent(body, "msg_002", nowTs(), rawKey);

    const tampered = JSON.stringify({ amount: 999 });
    expect(await RecurrenteWebhooks.verifySignature(tampered, headers, secret)).toBe(false);
  });

  it("returns false when secret is wrong", async () => {
    const key1  = crypto.getRandomValues(new Uint8Array(24));
    const key2  = crypto.getRandomValues(new Uint8Array(24));
    const body  = "{}";
    const { headers } = await makeSignedEvent(body, "msg_003", nowTs(), key1);
    const wrongSecret = `whsec_${btoa(String.fromCharCode(...key2))}`;

    expect(await RecurrenteWebhooks.verifySignature(body, headers, wrongSecret)).toBe(false);
  });

  it("returns false when svix-signature header is missing", async () => {
    expect(await RecurrenteWebhooks.verifySignature(
      "{}",
      { "svix-id": "x", "svix-timestamp": String(nowTs()), "svix-signature": "" },
      "whsec_dGVzdA==",
    )).toBe(false);
  });

  it("returns false when timestamp is malformed", async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(24));
    const { secret, headers } = await makeSignedEvent("{}", "msg_004", nowTs(), rawKey);
    const badHeaders = { ...headers, "svix-timestamp": "not-a-number" };

    expect(await RecurrenteWebhooks.verifySignature("{}", badHeaders, secret)).toBe(false);
  });

  it("returns false for a stale event (> 5 min old)", async () => {
    const rawKey   = crypto.getRandomValues(new Uint8Array(24));
    const staleTs  = nowTs() - 301; // 5 min 1 s ago
    const body     = "{}";
    const { secret, headers } = await makeSignedEvent(body, "msg_005", staleTs, rawKey);

    expect(await RecurrenteWebhooks.verifySignature(body, headers, secret)).toBe(false);
  });

  it("accepts a stale event when maxAgeSeconds is disabled (Infinity)", async () => {
    const rawKey   = crypto.getRandomValues(new Uint8Array(24));
    const staleTs  = nowTs() - 3600; // 1 hour ago
    const body     = "{}";
    const { secret, headers } = await makeSignedEvent(body, "msg_006", staleTs, rawKey);

    expect(
      await RecurrenteWebhooks.verifySignature(body, headers, secret, { maxAgeSeconds: Infinity }),
    ).toBe(true);
  });

  it("accepts a custom maxAgeSeconds window", async () => {
    const rawKey  = crypto.getRandomValues(new Uint8Array(24));
    const ts      = nowTs() - 59; // 59 seconds ago
    const body    = "{}";
    const { secret, headers } = await makeSignedEvent(body, "msg_007", ts, rawKey);

    // 60s window — should pass
    expect(
      await RecurrenteWebhooks.verifySignature(body, headers, secret, { maxAgeSeconds: 60 }),
    ).toBe(true);

    // 30s window — should fail
    expect(
      await RecurrenteWebhooks.verifySignature(body, headers, secret, { maxAgeSeconds: 30 }),
    ).toBe(false);
  });

  it("supports key rotation — accepts any valid signature in the list", async () => {
    const key1 = crypto.getRandomValues(new Uint8Array(24));
    const key2 = crypto.getRandomValues(new Uint8Array(24)); // the NEW active key

    const body   = "{}";
    const msgId  = "msg_008";
    const ts     = nowTs();

    // Sign with key2 (the new key)
    const { headers: headersKey2 } = await makeSignedEvent(body, msgId, ts, key2);
    // Build a secret that represents key1 (old) — the SDK should try key2 sig
    const oldSecret = `whsec_${btoa(String.fromCharCode(...key1))}`;

    // Provide both v1 signatures: first wrong (old key), then correct (new key)
    const { secret: newSecret } = await makeSignedEvent(body, msgId, ts, key2);
    const sig2 = headersKey2["svix-signature"]; // e.g. v1,<base64>

    // Combine both signatures in the header (space-separated per Svix spec)
    const combinedSig = `v1,invalidSig ${sig2}`;
    const headers = { "svix-id": msgId, "svix-timestamp": String(ts), "svix-signature": combinedSig };

    // Must accept because the second signature is valid
    expect(await RecurrenteWebhooks.verifySignature(body, headers, newSecret)).toBe(true);
    // Must reject with the old secret
    expect(await RecurrenteWebhooks.verifySignature(body, headers, oldSecret)).toBe(false);
  });
});
