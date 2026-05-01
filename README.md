# recurrente-sdk

**Unofficial TypeScript SDK for the [Recurrente](https://recurrente.com) REST API.**  
Zero runtime dependencies · Edge & Serverless compatible · Fully typed

[![npm version](https://img.shields.io/npm/v/@rodmarzavala%2Frecurrente-sdk?color=4f46e5&style=flat-square)](https://www.npmjs.com/package/@rodmarzavala/recurrente-sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-4f46e5?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/rodmarzavala/recurrente-sdk/ci.yml?label=CI&style=flat-square)](https://github.com/rodmarzavala/recurrente-sdk/actions/workflows/ci.yml)
[![Security](https://img.shields.io/github/actions/workflow/status/rodmarzavala/recurrente-sdk/security.yml?label=security&color=22c55e&style=flat-square)](https://github.com/rodmarzavala/recurrente-sdk/actions/workflows/security.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-4f46e5?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Why this SDK?

| Feature | Details |
|---------|----------|
| 🚀 **Edge-first** | Uses only Web-standard APIs — runs on Cloudflare Workers, Vercel Edge, Deno, Bun, and Node.js ≥ 18 with zero changes |
| 📦 **Zero runtime deps** | `fetch` native + Web Crypto API — nothing in `dependencies` |
| 🔒 **Secure by default** | Webhook verification uses `crypto.subtle.verify` (constant-time) + replay-attack prevention (5 min window) |
| 💪 **Resilient** | Exponential backoff retries for 429 & 5xx · `Retry-After` support · 30 s timeout via `AbortController` |
| 🎯 **Fully typed** | Strict TypeScript throughout — `noImplicitAny`, no `any` |
| 🔑 **Idempotent** | UUID `Idempotency-Key` auto-generated and reused across retries — no duplicate charges |
| 📋 **Paginated** | All list endpoints return `Page<T>` with `pageIterator()` and `autoPagingToArray()` helpers |

---

## Installation

```bash
npm install recurrente-sdk
# or
pnpm add recurrente-sdk
# or
yarn add recurrente-sdk
```

> **Runtime requirement:** Node.js ≥ 18, Deno ≥ 1.38, Bun ≥ 1.0, or any runtime with the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).

---

## Quick Start

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

// Create a checkout and redirect the customer
const checkout = await recurrente.checkouts.create({
  items: [
    {
      name: "Plan Pro",
      amount_in_cents: 29900, // Q299.00
      currency: "GTQ",
      quantity: 1,
    },
  ],
  success_url: "https://yourdomain.com/gracias",
  cancel_url: "https://yourdomain.com/cancelar",
});

redirect(checkout.checkout_url);
```

---

## Features

### Checkouts

```typescript
const checkout = await recurrente.checkouts.create({ ... });
const checkout = await recurrente.checkouts.retrieve("ch_abc123");
const page     = await recurrente.checkouts.list({ page: 1, items: 20 });
```

### Subscriptions

```typescript
const { subscription, checkout_url } = await recurrente.subscriptions.create({ ... });
const sub  = await recurrente.subscriptions.retrieve("su_abc123");
const page = await recurrente.subscriptions.list();
await recurrente.subscriptions.cancel("su_abc123");
```

### Refunds

```typescript
// Full refund
const refund = await recurrente.refunds.create({ checkout_id: "ch_abc123" });
// Partial refund
const partial = await recurrente.refunds.create({ checkout_id: "ch_abc123", amount_in_cents: 5000 });
const page = await recurrente.refunds.list({ checkout_id: "ch_abc123" });
```

### Products

```typescript
const page    = await recurrente.products.list();
const product = await recurrente.products.retrieve("prod_abc123");
const created = await recurrente.products.create({ name: "Plan Pro", ... });
const updated = await recurrente.products.update("prod_abc123", { name: "Plan Pro v2" });
await recurrente.products.archive("prod_abc123");
```

### Customers

```typescript
const page     = await recurrente.customers.list();
const customer = await recurrente.customers.retrieve("cus_abc123");
const created  = await recurrente.customers.create({ email: "user@example.com" });
```

### Webhook endpoints

```typescript
const endpoint = await recurrente.webhookEndpoints.create({
  url: "https://myapp.com/webhooks/recurrente",
});
console.log(endpoint.signing_secret); // save this — shown only once!
await recurrente.webhookEndpoints.delete(endpoint.id);
```

### Pagination

```typescript
import { pageIterator, autoPagingToArray } from "@rodmarzavala/recurrente-sdk";

// Iterate page by page
for await (const page of pageIterator((p) => recurrente.products.list(p))) {
  page.data.forEach((p) => console.log(p.name));
}

// Get all items at once
const all = await autoPagingToArray((p) => recurrente.customers.list(p));
```

### Webhook verification

Verify that incoming webhooks are authentic — works in every runtime.

```typescript
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const isValid = await RecurrenteWebhooks.verifySignature(
  rawBody,   // ⚠️ raw string — NOT parsed JSON
  {
    "svix-id":        req.headers["svix-id"],
    "svix-timestamp": req.headers["svix-timestamp"],
    "svix-signature": req.headers["svix-signature"],
  },
  process.env.RECURRENTE_WEBHOOK_SECRET!, // "whsec_..."
);

if (!isValid) return res.status(401).send("Unauthorized");
```

### Error handling

```typescript
import { RecurrenteError } from "@rodmarzavala/recurrente-sdk";

try {
  await recurrente.checkouts.retrieve("ch_nonexistent");
} catch (err) {
  if (err instanceof RecurrenteError) {
    console.error(err.statusCode); // 404
    console.error(err.message);    // API error message
    console.error(err.body);       // Full error body
  }
}
```

### Automatic retries

The client retries `429` (rate limit) and `5xx` responses automatically with
full-jitter exponential backoff (max 3 retries, cap 30 s). Configure via `maxRetries`:

```typescript
const recurrente = new Recurrente({
  publicKey: "...",
  secretKey: "...",
  maxRetries: 5, // or 0 to disable
});
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation, first request, sandbox vs production |
| [API Reference](./docs/api-reference.md) | All methods, parameters, and TypeScript interfaces |
| [Webhooks Guide](./docs/webhooks.md) | Verification, event types, framework examples, best practices |
| [Recurrente Docs](https://docs.recurrente.com) | Official Recurrente API documentation |

---

## Compatibility

| Runtime | Minimum version | Status |
|---------|----------------|--------|
| Node.js | 18.0.0 | ✅ Supported |
| Cloudflare Workers | Any | ✅ Supported |
| Vercel Edge Functions | Any | ✅ Supported |
| Deno | 1.38.0 | ✅ Supported |
| Bun | 1.0.0 | ✅ Supported |
| Browser | Modern (ES2022+) | ✅ Supported |

---

## Contributing

Contributions of all kinds are welcome! Whether it's a bug fix, a new module,
or a typo in the docs — every PR matters.

👉 Read [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

**Quick start for contributors:**

```bash
git clone https://github.com/rodmarzavala/recurrente-sdk.git
cd recurrente-sdk
npm install
npm test         # 13 tests, should all pass
npm run typecheck  # zero errors
```

---

## Roadmap

The following modules are planned for future releases. PRs welcome!

- [ ] `refunds` — create and retrieve refunds
- [ ] `products` — list, create, and update products
- [ ] `customers` — manage customer records
- [ ] `transfers` — balance transfers between accounts
- [ ] `webhook_endpoints` — programmatic endpoint management
- [ ] Pagination helpers
- [ ] Automatic replay-attack prevention (configurable `maxWebhookAge`)

---

## License

MIT — see [LICENSE](./LICENSE).

---

> **Disclaimer:** This is an independent open-source project and is not
> officially affiliated with or endorsed by Recurrente.
