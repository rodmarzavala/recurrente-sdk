# Webhooks Guide

Recurrente sends real-time webhook events to your server whenever something
important happens — a payment succeeds, a subscription is created or cancelled, etc.

---

## How Recurrente webhooks work

1. An event occurs (e.g. a card payment succeeds).
2. Recurrente sends an **HTTP POST** to the URL you configured, with a JSON body.
3. Your server verifies the signature and processes the event.
4. Your server responds with any `2xx` status code within a few seconds.

Recurrente uses [Svix](https://svix.com) to deliver webhooks reliably.

---

## Configuring a webhook endpoint

### Via Dashboard

1. Log in to [app.recurrente.com](https://app.recurrente.com)
2. Go to **Settings → Developers & API → Webhooks**
3. Click **Add endpoint** and enter your URL

### Via API

```bash
curl -X POST https://app.recurrente.com/api/webhook_endpoints \
  -H "X-PUBLIC-KEY: pk_live_..." \
  -H "X-SECRET-KEY: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/webhooks/recurrente", "description": "Production"}'
```

---

## Getting your signing secret

Each endpoint has a unique **Signing Secret** in the format `whsec_<base64>`.  
Find it in: **Settings → Developers & API → Webhooks → [your endpoint] → Signing Secret**

Store it as an environment variable:

```bash
RECURRENTE_WEBHOOK_SECRET=whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw
```

---

## Verifying webhook signatures

**Always verify signatures in production.** This ensures the request actually came from Recurrente and wasn't tampered with.

The SDK uses the **Web Crypto API** internally — no Node.js dependencies — so it works in Cloudflare Workers, Vercel Edge, Deno, Bun, and Node.js ≥ 18.

### The three Svix headers

Every webhook request includes:

| Header | Description |
|--------|-------------|
| `svix-id` | Unique message ID — use this for idempotency |
| `svix-timestamp` | Unix timestamp (seconds) when Recurrente sent the event |
| `svix-signature` | `v1,<base64-hmac>` — the HMAC-SHA256 signature |

### Framework examples

#### Node.js / Express

```typescript
import express from "express";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const app = express();

// ⚠️ Use raw body parser — JSON.parse + re-serialize breaks the signature
app.post(
  "/webhooks/recurrente",
  express.raw({ type: "application/json" }),
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

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);
    await handleEvent(event);

    res.status(200).json({ received: true });
  },
);
```

#### Hono (Edge / Cloudflare Workers)

```typescript
import { Hono } from "hono";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const app = new Hono();

app.post("/webhooks/recurrente", async (c) => {
  const rawBody = await c.req.text(); // raw string — do not use c.req.json()

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
  await handleEvent(event);

  return c.json({ received: true });
});
```

#### Next.js App Router (Edge Runtime)

```typescript
// app/api/webhooks/recurrente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

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
  await handleEvent(event);

  return NextResponse.json({ received: true });
}
```

---

## Event types

| `event_type` | When it fires |
|---|---|
| `payment_intent.succeeded` | Card payment was successful |
| `payment_intent.failed` | Card payment failed |
| `subscription.create` | Subscription activated for the first time |
| `subscription.past_due` | First automatic charge attempt failed |
| `subscription.paused` | Subscription paused manually |
| `subscription.cancel` | Subscription cancelled (after all retry attempts fail) |
| `bank_transfer_intent.pending` | Bank transfer initiated |
| `bank_transfer_intent.succeeded` | Bank transfer funds received |
| `bank_transfer_intent.failed` | Bank transfer funds not received or wrong amount |
| `setup_intent.succeeded` | Card tokenized (subscription with free trial, or card-only tokenization) |
| `setup_intent.cancelled` | Card tokenization failed |

### Example payload — `payment_intent.succeeded`

```json
{
  "id": "pa_id123",
  "event_type": "payment_intent.succeeded",
  "api_version": "2024-04-24",
  "checkout": {
    "id": "ch_id123",
    "status": "paid",
    "payment": {
      "id": "pa_laybj3zw",
      "paymentable": {
        "type": "OneTimePayment",
        "id": "on_arognqni"
      }
    },
    "payment_method": {
      "id": "pay_m_7v5ie3pw",
      "type": "card",
      "card": { "last4": "4242", "network": "visa" }
    },
    "metadata": {}
  },
  "created_at": "2024-02-16T03:01:13.260Z",
  "failure_reason": null,
  "amount_in_cents": 10000,
  "currency": "GTQ",
  "fee": 450,
  "customer": {
    "email": "hello@example.com",
    "full_name": "Max Rodriguez",
    "id": "us_id123"
  }
}
```

---

## Retry schedule

If your endpoint doesn't respond with `2xx`, Recurrente retries delivery:

| Attempt | Delay |
|---------|-------|
| 1 | Immediately |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 6 hours |

---

## Best practices

- **Return `2xx` immediately** — queue heavy processing; don't do it synchronously.
- **Idempotency** — webhooks may be delivered more than once. Use `svix-id` as a deduplication key in your database.
- **Reject old events** — optionally reject events where `svix-timestamp` is more than 5 minutes old to prevent replay attacks.
- **Always verify signatures** — never trust the payload without calling `verifySignature`.

### Optional: Replay-attack prevention

```typescript
const MAX_AGE_SECONDS = 300; // 5 minutes

const tsSeconds = parseInt(headers["svix-timestamp"], 10);
const ageSeconds = Math.floor(Date.now() / 1000) - tsSeconds;

if (ageSeconds > MAX_AGE_SECONDS) {
  return res.status(400).json({ error: "Webhook too old" });
}
```

---

## Sandbox note

Webhooks are **not sent** for checkouts created with `pk_test_` keys.  
To test the full webhook flow end-to-end you need live keys and a real card.
