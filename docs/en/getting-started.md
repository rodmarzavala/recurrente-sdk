# Getting Started

> **Prerequisites:** Node.js ≥ 18, Deno ≥ 1.38, Bun ≥ 1.0, or any runtime with
> native `fetch` and the Web Crypto API (Cloudflare Workers, Vercel Edge, etc.)

## Installation

```bash
npm install recurrente-sdk
# or
pnpm add recurrente-sdk
# or
yarn add recurrente-sdk
```

## Your first request

### 1. Get your API keys

Log in to [app.recurrente.com](https://app.recurrente.com) → **Settings → API Keys**.

You'll find two sets of keys:

| Key type | Prefix | Use |
|----------|--------|-----|
| Public | `pk_live_` / `pk_test_` | Creating checkouts (safe for client-side) |
| Secret | `sk_live_` / `sk_test_` | All other operations (server-side only) |

> ⚠️ **Never expose your secret key in client-side code or public repositories.**

### 2. Instantiate the client

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});
```

### 3. Create a checkout

```typescript
const checkout = await recurrente.checkouts.create({
  items: [
    {
      name: "Plan Pro",
      amount_in_cents: 29900, // Q299.00
      currency: "GTQ",
      quantity: 1,
    },
  ],
  success_url: "https://yourdomain.com/thanks",
  cancel_url: "https://yourdomain.com/pricing",
});

// Redirect your customer here
console.log(checkout.checkout_url);
```

### 4. Verify incoming webhooks

```typescript
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

// Express / Hono / any framework — use the RAW body string
app.post("/webhooks/recurrente", async (req, res) => {
  const isValid = await RecurrenteWebhooks.verifySignature(
    req.rawBody,                        // raw string, NOT parsed JSON
    {
      "svix-id":        req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    },
    process.env.RECURRENTE_WEBHOOK_SECRET!, // whsec_...
  );

  if (!isValid) return res.status(401).send("Unauthorized");

  const event = req.body;
  console.log(event.event_type); // "payment_intent.succeeded"

  res.status(200).send("OK");
});
```

---

## Environment variables

We recommend a `.env` file (never commit this!):

```bash
# .env
RECURRENTE_PUBLIC_KEY=pk_live_...
RECURRENTE_SECRET_KEY=sk_live_...
RECURRENTE_WEBHOOK_SECRET=whsec_...
```

Add `.env` to your `.gitignore`:

```bash
echo ".env" >> .gitignore
```

---

## Sandbox vs Production

The same base URL is used for both environments — the key prefix determines the mode:

| Key prefix | Mode | Real money? | Webhooks? |
|------------|------|-------------|-----------|
| `pk_test_` / `sk_test_` | Sandbox | ❌ No | ❌ No |
| `pk_live_` / `sk_live_` | Production | ✅ Yes | ✅ Yes |

Test card number: `4242 4242 4242 4242` (any future expiry, any CVV).

---

## Next steps

- [API Reference](./api-reference.md) — all methods, parameters, and response shapes
- [Webhooks Guide](./webhooks.md) — event types, verification, best practices
- [Contributing](https://github.com/rodmarzavala/recurrente-sdk/blob/main/CONTRIBUTING.md) — how to add features or report bugs
