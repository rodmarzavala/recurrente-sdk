# Usage Guide

Practical, copy-paste patterns for common integration scenarios.

---

## Table of Contents

1. [Basic setup](#1-basic-setup)
2. [One-time payments (checkouts)](#2-one-time-payments-checkouts)
3. [Recurring subscriptions](#3-recurring-subscriptions)
4. [Receiving webhooks](#4-receiving-webhooks)
5. [Error handling patterns](#5-error-handling-patterns)
6. [Framework recipes](#6-framework-recipes)
7. [Edge / Serverless deployment](#7-edge--serverless-deployment)

---

## 1. Basic setup

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

// Create ONE instance and share it across your app (module singleton pattern)
export const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});
```

> ⚠️ Never put your `secretKey` in client-side code, `.env` files committed to git,
> or anywhere a browser can read it. The public key is safe for the browser.

---

## 2. One-time payments (checkouts)

### Create a checkout and redirect

```typescript
import { recurrente } from "./lib/recurrente.js";

export async function createOrder(productName: string, amountGTQ: number) {
  const checkout = await recurrente.checkouts.create({
    items: [
      {
        name:            productName,
        amount_in_cents: Math.round(amountGTQ * 100), // Q → centavos
        currency:        "GTQ",
        quantity:        1,
      },
    ],
    success_url: `${process.env.APP_URL}/orders/success?session={CHECKOUT_ID}`,
    cancel_url:  `${process.env.APP_URL}/orders/cancel`,
    metadata: {
      // These fields come back in the webhook payload — use them for order lookup
      internal_order_id: crypto.randomUUID(),
    },
  });

  return checkout; // checkout.checkout_url → redirect user here
}
```

### Check payment status (polling)

```typescript
async function waitForPayment(checkoutId: string, timeoutMs = 60_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const checkout = await recurrente.checkouts.retrieve(checkoutId);

    if (checkout.status === "paid")      return { success: true,  checkout };
    if (checkout.status === "cancelled") return { success: false, checkout };

    await new Promise((r) => setTimeout(r, 2_000)); // poll every 2 seconds
  }

  throw new Error("Payment timed out");
}
```

### Multiple items / cart

```typescript
const checkout = await recurrente.checkouts.create({
  items: cart.map((item) => ({
    name:            item.name,
    amount_in_cents: item.priceInCents,
    currency:        "GTQ",
    quantity:        item.qty,
    description:     item.sku,
    metadata:        { product_id: item.id },
  })),
  success_url: "https://mystore.com/gracias",
  cancel_url:  "https://mystore.com/carrito",
  customer_email: customer.email,
});
```

### USD checkout

```typescript
const checkout = await recurrente.checkouts.create({
  items: [{
    name:            "International Plan",
    amount_in_cents: 4900, // $49.00 USD
    currency:        "USD",
    quantity:        1,
  }],
  success_url: "https://example.com/success",
  cancel_url:  "https://example.com/cancel",
});
```

---

## 3. Recurring subscriptions

### Start a subscription

```typescript
const { checkout_url, subscription } = await recurrente.subscriptions.create({
  product_id:     "prod_your_plan_id",   // from Recurrente dashboard
  price_id:       "price_monthly",       // from Recurrente dashboard
  customer_email: user.email,
  success_url:    `${APP_URL}/dashboard?plan=activated`,
  cancel_url:     `${APP_URL}/pricing`,
  metadata:       { user_id: user.id },
});

// subscription.id — save this to your database
await db.users.update(user.id, { recurrente_subscription_id: subscription.id });

// Redirect user to complete payment
redirect(checkout_url);
```

### Cancel a subscription

```typescript
async function cancelSubscription(userId: string) {
  const user = await db.users.findById(userId);

  if (!user.recurrente_subscription_id) {
    throw new Error("User has no active subscription");
  }

  const cancelled = await recurrente.subscriptions.cancel(
    user.recurrente_subscription_id,
  );

  await db.users.update(userId, {
    subscription_status: cancelled.status, // "cancelled"
    cancelled_at: new Date().toISOString(),
  });

  return cancelled;
}
```

---

## 4. Receiving webhooks

The most important rule: **always use the raw body string**. Parsing JSON and
re-serializing it changes whitespace and key order, which breaks the HMAC signature.

### Generic handler (any framework)

```typescript
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";
import type { SvixHeaders }   from "@rodmarzavala/recurrente-sdk";

export async function handleRecurrenteWebhook(
  rawBody:  string,      // ← raw string, not parsed
  headers:  SvixHeaders,
  secret:   string,
): Promise<void> {

  // 1. Verify signature — reject immediately if invalid
  const isValid = await RecurrenteWebhooks.verifySignature(rawBody, headers, secret);
  if (!isValid) throw new Error("Invalid webhook signature");

  // 2. Optional: reject stale events (replay-attack prevention)
  const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(headers["svix-timestamp"], 10);
  if (ageSeconds > 300) throw new Error("Webhook too old (> 5 minutes)");

  // 3. Parse and dispatch
  const event = JSON.parse(rawBody) as { event_type: string; id: string };

  // Use svix-id for idempotency — process each event exactly once
  const alreadyProcessed = await db.webhookEvents.exists(headers["svix-id"]);
  if (alreadyProcessed) return; // idempotent — ignore duplicates

  await db.webhookEvents.insert({ id: headers["svix-id"], processed_at: new Date() });

  switch (event.event_type) {
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event);
      break;
    case "payment_intent.failed":
      await handlePaymentFailed(event);
      break;
    case "subscription.create":
      await handleSubscriptionCreated(event);
      break;
    case "subscription.cancel":
      await handleSubscriptionCancelled(event);
      break;
    default:
      console.log(`Unhandled event type: ${event.event_type}`);
  }
}
```

---

## 5. Error handling patterns

### Type-safe error handling

```typescript
import { RecurrenteError } from "@rodmarzavala/recurrente-sdk";

async function safeCreateCheckout(data: CreateCheckoutRequest) {
  try {
    return await recurrente.checkouts.create(data);

  } catch (err) {
    if (err instanceof RecurrenteError) {
      switch (err.statusCode) {
        case 401:
          // Bad or missing API keys
          throw new Error("API credentials are invalid or mismatched");

        case 400:
        case 422:
          // Validation error — err.body.errors has per-field details
          const fieldErrors = Object.entries(err.body.errors ?? {})
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join("\n");
          throw new Error(`Validation failed:\n${fieldErrors}`);

        case 429:
          // Rate limited — the SDK already retried 3 times with backoff
          throw new Error("Rate limit exceeded after retries. Try again later.");

        default:
          throw new Error(`API error ${err.statusCode}: ${err.message}`);
      }
    }

    // Network error (statusCode === 0)
    throw err;
  }
}
```

### Disable retries for time-sensitive operations

```typescript
// Create a client with no retries for operations where speed > resilience
const fastClient = new Recurrente({
  publicKey:  process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey:  process.env.RECURRENTE_SECRET_KEY!,
  maxRetries: 0,
});
```

---

## 6. Framework recipes

### Express.js

```typescript
import express from "express";
import { Recurrente, RecurrenteError, RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const app = express();
const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

// Create checkout — JSON body parsed normally
app.use("/api", express.json());

app.post("/api/checkout", async (req, res) => {
  try {
    const checkout = await recurrente.checkouts.create(req.body);
    res.json({ checkout_url: checkout.checkout_url, id: checkout.id });
  } catch (err) {
    if (err instanceof RecurrenteError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Webhooks — ⚠️ raw body required
app.post(
  "/webhooks/recurrente",
  express.raw({ type: "application/json" }), // ← bypass JSON parsing
  async (req, res) => {
    const rawBody = req.body.toString("utf-8");

    const isValid = await RecurrenteWebhooks.verifySignature(
      rawBody,
      {
        "svix-id":        req.headers["svix-id"] as string,
        "svix-timestamp": req.headers["svix-timestamp"] as string,
        "svix-signature": req.headers["svix-signature"] as string,
      },
      process.env.RECURRENTE_WEBHOOK_SECRET!,
    );

    if (!isValid) return res.status(401).send("Unauthorized");

    // Respond immediately — process asynchronously
    res.status(200).json({ received: true });

    const event = JSON.parse(rawBody);
    setImmediate(() => processWebhookEvent(event));
  },
);
```

### Next.js App Router (Node.js runtime)

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { recurrente } from "@/lib/recurrente";
import { RecurrenteError } from "@rodmarzavala/recurrente-sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const checkout = await recurrente.checkouts.create(body);
    return NextResponse.json({ checkout_url: checkout.checkout_url });
  } catch (err) {
    if (err instanceof RecurrenteError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

```typescript
// app/api/webhooks/recurrente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

// Works with BOTH Node.js and Edge runtime
export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // ← raw string

  const isValid = await RecurrenteWebhooks.verifySignature(
    rawBody,
    {
      "svix-id":        req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    },
    process.env.RECURRENTE_WEBHOOK_SECRET!,
  );

  if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = JSON.parse(rawBody);
  // Queue event processing (e.g., Vercel Queue, Upstash, etc.)
  await queueWebhookEvent(event);

  return NextResponse.json({ received: true });
}
```

### Hono (Cloudflare Workers / Bun / Deno)

```typescript
import { Hono } from "hono";
import { Recurrente, RecurrenteWebhooks, RecurrenteError } from "@rodmarzavala/recurrente-sdk";

// Cloudflare Workers: env vars come from the execution context
type Env = {
  Bindings: {
    RECURRENTE_PUBLIC_KEY:     string;
    RECURRENTE_SECRET_KEY:     string;
    RECURRENTE_WEBHOOK_SECRET: string;
  };
};

const app = new Hono<Env>();

app.post("/checkout", async (c) => {
  const recurrente = new Recurrente({
    publicKey: c.env.RECURRENTE_PUBLIC_KEY,
    secretKey: c.env.RECURRENTE_SECRET_KEY,
  });

  try {
    const body = await c.req.json();
    const checkout = await recurrente.checkouts.create(body);
    return c.json({ checkout_url: checkout.checkout_url });
  } catch (err) {
    if (err instanceof RecurrenteError) {
      return c.json({ error: err.message }, err.statusCode as 400 | 401 | 404 | 422);
    }
    return c.json({ error: "Server error" }, 500);
  }
});

app.post("/webhooks/recurrente", async (c) => {
  const rawBody = await c.req.text();

  const isValid = await RecurrenteWebhooks.verifySignature(
    rawBody,
    {
      "svix-id":        c.req.header("svix-id") ?? "",
      "svix-timestamp": c.req.header("svix-timestamp") ?? "",
      "svix-signature": c.req.header("svix-signature") ?? "",
    },
    c.env.RECURRENTE_WEBHOOK_SECRET,
  );

  if (!isValid) return c.text("Unauthorized", 401);

  const event = JSON.parse(rawBody);
  c.executionCtx.waitUntil(processEvent(event)); // non-blocking in CF Workers

  return c.json({ received: true });
});

export default app;
```

### Fastify

```typescript
import Fastify from "fastify";
import { Recurrente, RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const fastify = Fastify();
const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

// Webhook route — add raw body parser for this path only
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string", bodyLimit: 1_048_576 },
  (req, body, done) => done(null, body),
);

fastify.post<{ Body: string }>("/webhooks/recurrente", async (request, reply) => {
  const rawBody = request.body; // already a string

  const isValid = await RecurrenteWebhooks.verifySignature(
    rawBody,
    {
      "svix-id":        request.headers["svix-id"] as string,
      "svix-timestamp": request.headers["svix-timestamp"] as string,
      "svix-signature": request.headers["svix-signature"] as string,
    },
    process.env.RECURRENTE_WEBHOOK_SECRET!,
  );

  if (!isValid) return reply.status(401).send({ error: "Unauthorized" });

  reply.status(200).send({ received: true }); // respond before processing
  await processWebhookEvent(JSON.parse(rawBody));
});
```

---

## 7. Edge / Serverless deployment

The SDK has **zero Node.js dependencies** — it uses only:
- `fetch` (global in Node.js 18+, Deno, Bun, CF Workers, browser)
- `crypto.subtle` (Web Crypto API — available in all modern runtimes)
- `atob` / `btoa` (available everywhere)
- `TextEncoder` (available everywhere)

### Cloudflare Workers

Works out of the box. Use `c.executionCtx.waitUntil()` for async webhook processing so the worker doesn't terminate before your handler finishes.

### Vercel Edge Functions

Set `export const runtime = "edge"` on your route. Use `req.text()` for webhook body — **never** `req.json()`.

### Deno Deploy

```typescript
import { Recurrente } from "npm:recurrente-sdk";
const recurrente = new Recurrente({ ... });
```

### AWS Lambda (Node.js 18+)

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

const recurrente = new Recurrente({ ... }); // instantiate outside handler

export const handler = async (event: AWSLambdaEvent) => {
  const checkout = await recurrente.checkouts.create({ ... });
  return { statusCode: 200, body: JSON.stringify({ checkout_url: checkout.checkout_url }) };
};
```
