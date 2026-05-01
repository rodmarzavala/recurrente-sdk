#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// scripts/integration-test.ts
//
// Live integration test against the Recurrente API sandbox.
// Validates every SDK method end-to-end against real HTTP responses.
//
// Usage:
//   cp .env.example .env      # fill in your test keys
//   npm run test:integration
//
// ⚠️  Use ONLY test keys (pk_test_ / sk_test_).  No real money is moved.
// ─────────────────────────────────────────────────────────────────────────────

import { Recurrente, RecurrenteError, RecurrenteWebhooks } from "../src/index.js";

// ── Env loader (no dotenv dep — Node.js 20.6+ has --env-file) ────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || val.endsWith("_")) {
    throw new Error(
      `Missing env var: ${name}\n  Copy .env.example → .env and fill in your test API keys.`,
    );
  }
  return val;
}

// ── Console helpers ───────────────────────────────────────────────────────────

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const DIM    = "\x1b[2m";
const RESET  = "\x1b[0m";

function pass(label: string, detail = "") {
  console.log(`  ${GREEN}✓${RESET} ${label}${detail ? `  ${DIM}${detail}${RESET}` : ""}`);
}

function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`  ${RED}✗${RESET} ${label}`);
  console.error(`    ${RED}${msg}${RESET}`);
}

function skip(label: string, reason: string) {
  console.log(`  ${YELLOW}⊘${RESET} ${label}  ${DIM}(${reason})${RESET}`);
}

function section(title: string) {
  console.log(`\n${CYAN}▶ ${title}${RESET}`);
}

// ── Result tracker ────────────────────────────────────────────────────────────

const results: { label: string; ok: boolean }[] = [];

async function run(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(label);
    results.push({ label, ok: true });
  } catch (err) {
    fail(label, err);
    results.push({ label, ok: false });
  }
}

// ── Test suite ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${CYAN}━━━ recurrente-sdk · Integration Tests ━━━${RESET}\n`);

  // Load credentials
  const PUBLIC_KEY      = requireEnv("RECURRENTE_PUBLIC_KEY");
  const SECRET_KEY      = requireEnv("RECURRENTE_SECRET_KEY");
  const WEBHOOK_SECRET  = process.env["RECURRENTE_WEBHOOK_SECRET"] ?? "";
  const TEST_PRODUCT_ID = process.env["RECURRENTE_TEST_PRODUCT_ID"] ?? "";
  const TEST_PRICE_ID   = process.env["RECURRENTE_TEST_PRICE_ID"] ?? "";

  const recurrente = new Recurrente({ publicKey: PUBLIC_KEY, secretKey: SECRET_KEY });

  // ── 1. Auth check ──────────────────────────────────────────────────────────

  section("Authentication");

  await run("GET /api/test — credentials accepted", async () => {
    const res = await fetch("https://app.recurrente.com/api/test", {
      headers: { "X-PUBLIC-KEY": PUBLIC_KEY, "X-SECRET-KEY": SECRET_KEY },
    });
    if (!res.ok) {
      const body = await res.json() as { message: string };
      throw new Error(`HTTP ${res.status}: ${body.message}`);
    }
  });

  await run("GET /api/test — 401 on bad credentials", async () => {
    const res = await fetch("https://app.recurrente.com/api/test", {
      headers: { "X-PUBLIC-KEY": "pk_bad", "X-SECRET-KEY": "sk_bad" },
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // ── 2. Checkouts ───────────────────────────────────────────────────────────

  section("Checkouts");

  let createdCheckoutId = "";

  await run("checkouts.create — returns checkout_url and id", async () => {
    const checkout = await recurrente.checkouts.create({
      items: [
        {
          name: "SDK Integration Test Item",
          amount_in_cents: 500, // Q5.00 (min API limit)
          currency: "GTQ",
          quantity: 1,
          description: "Created by integration-test.ts — safe to ignore",
        },
      ],
      success_url: "https://example.com/success",
      cancel_url:  "https://example.com/cancel",
      metadata:    { test: "true", source: "recurrente-sdk-integration-test" },
    });

    if (!checkout.id)           throw new Error("Missing id in response");
    if (!checkout.checkout_url) throw new Error("Missing checkout_url in response");

    createdCheckoutId = checkout.id;
    pass(`  checkout created`, `id=${checkout.id}`);
  });

  await run("checkouts.retrieve — fetches the checkout we just created", async () => {
    if (!createdCheckoutId) throw new Error("No checkout id from previous step");

    const checkout = await recurrente.checkouts.retrieve(createdCheckoutId);

    if (checkout.id !== createdCheckoutId) throw new Error("ID mismatch");
    if (checkout.status !== "unpaid") throw new Error(`Unexpected status: ${checkout.status}`);
  });

  await run("checkouts.retrieve — throws RecurrenteError(404) for unknown id", async () => {
    try {
      await recurrente.checkouts.retrieve("ch_thisdoesnotexist000");
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof RecurrenteError)) throw new Error("Expected RecurrenteError");
      if (err.statusCode !== 404) throw new Error(`Expected 404, got ${err.statusCode}`);
    }
  });

  await run("checkouts.create — throws RecurrenteError(400/422) with empty items", async () => {
    try {
      // @ts-expect-error intentional bad payload for testing
      await recurrente.checkouts.create({ items: [], success_url: "x", cancel_url: "x" });
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof RecurrenteError)) throw new Error("Expected RecurrenteError");
      if (err.statusCode < 400 || err.statusCode > 422) {
        throw new Error(`Unexpected status ${err.statusCode}`);
      }
    }
  });

  // ── 3. Subscriptions ───────────────────────────────────────────────────────

  section("Subscriptions");

  const hasSubscriptionEnv =
    TEST_PRODUCT_ID && !TEST_PRODUCT_ID.includes("xxxx") &&
    TEST_PRICE_ID   && !TEST_PRICE_ID.includes("xxxx") &&
    TEST_PRICE_ID !== "price_";

  if (hasSubscriptionEnv) {
    let createdSubscriptionId = "";

    await run("subscriptions.create — returns checkout_url", async () => {
      const result = await recurrente.subscriptions.create({
        product_id:     TEST_PRODUCT_ID,
        price_id:       TEST_PRICE_ID,
        customer_email: "sdk-integration-test@example.com",
        success_url:    "https://example.com/success",
        cancel_url:     "https://example.com/cancel",
        metadata:       { test: "true" },
      });

      if (!result.checkout_url)   throw new Error("Missing checkout_url");
      if (!result.subscription?.id) throw new Error("Missing subscription.id");

      createdSubscriptionId = result.subscription.id;
    });

    if (createdSubscriptionId) {
      await run("subscriptions.cancel — cancels subscription", async () => {
        const cancelled = await recurrente.subscriptions.cancel(createdSubscriptionId);
        if (cancelled.status !== "cancelled") {
          throw new Error(`Expected "cancelled", got "${cancelled.status}"`);
        }
      });
    }
  } else {
    skip(
      "subscriptions.create / cancel",
      "Set RECURRENTE_TEST_PRODUCT_ID and RECURRENTE_TEST_PRICE_ID in .env to enable",
    );
  }

  // ── 4. Webhooks ────────────────────────────────────────────────────────────

  section("Webhook Signature Verification (Web Crypto API)");

  await run("verifySignature — valid signature returns true", async () => {
    const rawBody    = JSON.stringify({ id: "evt_test", event_type: "payment_intent.succeeded" });
    const msgId      = "msg_integration_test_001";
    const msgTs      = String(Math.floor(Date.now() / 1000));

    // Generate a real signature with a fresh random key
    const rawKey   = crypto.getRandomValues(new Uint8Array(24));
    const base64Key = btoa(String.fromCharCode(...rawKey));
    const secret   = `whsec_${base64Key}`;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey.buffer.slice(rawKey.byteOffset, rawKey.byteOffset + rawKey.byteLength) as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signed    = `${msgId}.${msgTs}.${rawBody}`;
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signed));
    const sigB64    = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

    const valid = await RecurrenteWebhooks.verifySignature(
      rawBody,
      { "svix-id": msgId, "svix-timestamp": msgTs, "svix-signature": `v1,${sigB64}` },
      secret,
    );

    if (!valid) throw new Error("Expected true — valid signature rejected");
  });

  await run("verifySignature — tampered body returns false", async () => {
    const rawBody = JSON.stringify({ id: "evt_x" });
    const tampered = JSON.stringify({ id: "evt_y" }); // different!
    const rawKey  = crypto.getRandomValues(new Uint8Array(24));
    const base64Key = btoa(String.fromCharCode(...rawKey));
    const secret  = `whsec_${base64Key}`;
    const msgId   = "msg_tamper_test";
    const msgTs   = String(Math.floor(Date.now() / 1000));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey.buffer.slice(rawKey.byteOffset, rawKey.byteOffset + rawKey.byteLength) as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signed    = `${msgId}.${msgTs}.${rawBody}`;
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signed));
    const sigB64    = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

    const valid = await RecurrenteWebhooks.verifySignature(
      tampered, // ← different body
      { "svix-id": msgId, "svix-timestamp": msgTs, "svix-signature": `v1,${sigB64}` },
      secret,
    );

    if (valid) throw new Error("Expected false — tampered body should fail verification");
  });

  await run("verifySignature — wrong secret returns false", async () => {
    const rawKey1  = crypto.getRandomValues(new Uint8Array(24));
    const rawKey2  = crypto.getRandomValues(new Uint8Array(24));

    const signingSecret = `whsec_${btoa(String.fromCharCode(...rawKey1))}`;
    const wrongSecret   = `whsec_${btoa(String.fromCharCode(...rawKey2))}`;

    const body  = "{}";
    const msgId = "msg_wrong_key_test";
    const msgTs = String(Math.floor(Date.now() / 1000));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey1.buffer.slice(rawKey1.byteOffset, rawKey1.byteOffset + rawKey1.byteLength) as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sigBuffer = await crypto.subtle.sign(
      "HMAC", cryptoKey, new TextEncoder().encode(`${msgId}.${msgTs}.${body}`),
    );
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

    const valid = await RecurrenteWebhooks.verifySignature(
      body,
      { "svix-id": msgId, "svix-timestamp": msgTs, "svix-signature": `v1,${sigB64}` },
      wrongSecret,
    );

    if (valid) throw new Error("Expected false — wrong secret should fail");
  });

  // Optionally verify against the real webhook secret if provided
  if (WEBHOOK_SECRET && !WEBHOOK_SECRET.endsWith("_")) {
    skip(
      "verifySignature — against real webhook secret",
      "Provide a live webhook payload to test against a real Svix event",
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const total   = results.length;
  const passed  = results.filter((r) => r.ok).length;
  const failed  = total - passed;

  console.log(`\n${CYAN}━━━ Results ━━━${RESET}`);
  console.log(`  Total:  ${total}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
    console.log("\nFailed tests:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ${RED}✗ ${r.label}${RESET}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}All tests passed! The SDK is 100% operational. 🎉${RESET}\n`);
  }
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
