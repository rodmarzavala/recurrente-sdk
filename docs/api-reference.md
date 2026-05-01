# API Reference

Complete reference for all public methods exported by `@rodmarzavala/recurrente-sdk`.

---

## `new Recurrente(options)`

Creates the main SDK instance. Share one instance across your application.

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

const recurrente = new Recurrente(options);
```

### Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `publicKey` | `string` | ✅ | — | Public API key (`pk_live_…` or `pk_test_…`) |
| `secretKey` | `string` | ✅ | — | Secret API key (`sk_live_…` or `sk_test_…`) |
| `baseUrl` | `string` | ❌ | `https://app.recurrente.com` | Override the base URL |
| `maxRetries` | `number` | ❌ | `3` | Max retry attempts for 429 / 5xx responses |
| `timeout` | `number` | ❌ | `30000` | Request timeout in milliseconds. Set `0` to disable. |

---

## Pagination

All `list()` methods return a `Page<T>` object. Metadata comes from the API response headers (RFC 8288).

```typescript
interface Page<T> {
  data: T[];    // items on this page
  meta: {
    currentPage:  number;
    totalPages:   number;
    totalCount:   number;
    itemsPerPage: number;
    hasNextPage:  boolean;
    hasPrevPage:  boolean;
  };
}
```

### Pagination helpers

```typescript
import { pageIterator, autoPagingToArray } from "@rodmarzavala/recurrente-sdk";

// Iterate page by page
for await (const page of pageIterator((p) => recurrente.products.list(p))) {
  console.log(`Page ${page.meta.currentPage} of ${page.meta.totalPages}`);
  page.data.forEach((p) => console.log(p.name));
}

// Get all items as a flat array
const allProducts = await autoPagingToArray(
  (p) => recurrente.products.list(p),
  { limit: 100, itemsPerPage: 20 },
);
```

### `PaginationParams`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number (1-indexed) |
| `items` | `number` | `20` | Items per page |

---

## `recurrente.checkouts`

### `.create(data)` → `Promise<CheckoutResponse>`

Creates a new one-time payment checkout session.

> **Auth:** Requires only `X-PUBLIC-KEY` — safe to call from client-side code.

```typescript
const checkout = await recurrente.checkouts.create({
  items: [
    {
      name:            "Suscripción Mensual",
      amount_in_cents: 9900,
      currency:        "GTQ",
      quantity:        1,
      description:     "Acceso completo por 30 días",  // optional
    },
  ],
  success_url:    "https://yourdomain.com/gracias",
  cancel_url:     "https://yourdomain.com/cancelar",
  customer_email: "cliente@ejemplo.com",           // optional
  metadata:       { order_id: "ord_123" },         // optional
});

console.log(checkout.checkout_url); // redirect the customer here
```

#### `CheckoutItem`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Display name |
| `amount_in_cents` | `number` | ✅ | Amount in centavos |
| `currency` | `string` | ✅ | `"GTQ"` or `"USD"` |
| `quantity` | `number` | ✅ | Quantity |
| `description` | `string` | ❌ | Optional description |
| `metadata` | `Record<string, string>` | ❌ | Forwarded in webhooks |

### `.retrieve(id)` → `Promise<CheckoutResponse>`

```typescript
const checkout = await recurrente.checkouts.retrieve("ch_abc123");
console.log(checkout.status); // "paid"
```

### `.list(params?)` → `Promise<Page<CheckoutResponse>>`

```typescript
const page = await recurrente.checkouts.list({ page: 1, items: 20 });
console.log(page.meta.totalCount); // total number of checkouts
```

#### `CheckoutResponse`

```typescript
interface CheckoutResponse {
  id:              string;
  status:          "pending" | "paid" | "expired" | "cancelled";
  checkout_url:    string;
  live_mode:       boolean;
  amount_in_cents: number;
  currency:        string;
  success_url:     string;
  cancel_url:      string;
  customer_email:  string | null;
  metadata:        Record<string, string>;
  created_at:      string; // ISO 8601
  updated_at:      string; // ISO 8601
}
```

---

## `recurrente.subscriptions`

### `.create(data)` → `Promise<CreateSubscriptionResponse>`

```typescript
const { subscription, checkout_url } = await recurrente.subscriptions.create({
  product_id:     "prod_xyz",
  price_id:       "price_monthly",
  customer_email: "cliente@ejemplo.com",
  success_url:    "https://yourdomain.com/gracias",
  cancel_url:     "https://yourdomain.com/cancelar",
  metadata:       { referral: "promo_email" },
});
redirect(checkout_url);
```

### `.retrieve(id)` → `Promise<SubscriptionResponse>`

```typescript
const sub = await recurrente.subscriptions.retrieve("su_abc123");
console.log(sub.status); // "active"
```

### `.list(params?)` → `Promise<Page<SubscriptionResponse>>`

```typescript
const page = await recurrente.subscriptions.list({ page: 1, items: 20 });
```

### `.cancel(id)` → `Promise<SubscriptionResponse>`

```typescript
const cancelled = await recurrente.subscriptions.cancel("su_abc123");
console.log(cancelled.status); // "cancelled"
```

#### `SubscriptionResponse`

```typescript
interface SubscriptionResponse {
  id:                   string;
  status:               "active" | "past_due" | "paused" | "cancelled" | "trialing";
  customer_email:       string;
  customer_id:          string;
  product_id:           string;
  price:                SubscriptionPrice;
  current_period_start: string;
  current_period_end:   string;
  cancel_at_period_end: boolean;
  live_mode:            boolean;
  metadata:             Record<string, string>;
  created_at:           string;
  updated_at:           string;
}
```

---

## `recurrente.refunds`

### `.create(data)` → `Promise<RefundResponse>`

```typescript
// Full refund
const refund = await recurrente.refunds.create({
  checkout_id: "ch_abc123",
});

// Partial refund
const partial = await recurrente.refunds.create({
  checkout_id:    "ch_abc123",
  amount_in_cents: 5000, // refund Q50.00 of a larger payment
  reason:          "Customer request",
});
```

### `.retrieve(id)` → `Promise<RefundResponse>`

```typescript
const refund = await recurrente.refunds.retrieve("ref_abc123");
console.log(refund.status); // "succeeded"
```

### `.list(params?)` → `Promise<Page<RefundResponse>>`

```typescript
// All refunds
const all = await recurrente.refunds.list();

// Filtered by checkout
const forCheckout = await recurrente.refunds.list({ checkout_id: "ch_abc123" });
```

#### `RefundResponse`

```typescript
interface RefundResponse {
  id:              string;
  checkout_id:     string;
  amount_in_cents: number;
  currency:        string;
  reason:          string | null;
  status:          "pending" | "succeeded" | "failed";
  live_mode:       boolean;
  created_at:      string;
  updated_at:      string;
}
```

---

## `recurrente.products`

### `.list(params?)` → `Promise<Page<ProductResponse>>`

```typescript
const page = await recurrente.products.list({ page: 1, items: 10 });
```

### `.retrieve(id)` → `Promise<ProductResponse>`

```typescript
const product = await recurrente.products.retrieve("prod_abc123");
```

### `.create(data)` → `Promise<ProductResponse>`

```typescript
const product = await recurrente.products.create({
  name:        "Plan Pro",
  description: "Acceso completo a todas las funciones",
  success_url: "https://yourdomain.com/gracias",
  cancel_url:  "https://yourdomain.com/cancelar",
});
```

### `.update(id, data)` → `Promise<ProductResponse>`

```typescript
const updated = await recurrente.products.update("prod_abc123", {
  name: "Plan Pro — Actualizado",
});
```

### `.archive(id)` → `Promise<ProductResponse>`

Soft-deletes a product (sets status to `"archived"`).

```typescript
await recurrente.products.archive("prod_abc123");
```

---

## `recurrente.customers`

### `.list(params?)` → `Promise<Page<CustomerResponse>>`

```typescript
const page = await recurrente.customers.list();
```

### `.retrieve(id)` → `Promise<CustomerResponse>`

```typescript
const customer = await recurrente.customers.retrieve("cus_abc123");
```

### `.create(data)` → `Promise<CustomerResponse>`

```typescript
const customer = await recurrente.customers.create({
  email:     "cliente@ejemplo.com",
  full_name: "Juan García",
  phone:     "+502 5555-5555",
});
```

### `.update(id, data)` → `Promise<CustomerResponse>`

```typescript
const updated = await recurrente.customers.update("cus_abc123", {
  full_name: "Juan García López",
});
```

#### `CustomerResponse`

```typescript
interface CustomerResponse {
  id:        string;
  email:     string;
  full_name: string | null;
  phone:     string | null;
  live_mode: boolean;
  metadata:  Record<string, string>;
  created_at: string;
  updated_at: string;
}
```

---

## `recurrente.webhookEndpoints`

Manage webhook endpoints programmatically.

### `.list(params?)` → `Promise<Page<WebhookEndpointResponse>>`

```typescript
const endpoints = await recurrente.webhookEndpoints.list();
```

### `.retrieve(id)` → `Promise<WebhookEndpointResponse>`

```typescript
const endpoint = await recurrente.webhookEndpoints.retrieve("whe_abc123");
```

### `.create(data)` → `Promise<WebhookEndpointResponse>`

> ⚠️ **Save `signing_secret` immediately** — it is only returned once.

```typescript
const endpoint = await recurrente.webhookEndpoints.create({
  url:         "https://yourdomain.com/webhooks/recurrente",
  description: "Production webhook",
});

// Store this securely — it won't be shown again
console.log(endpoint.signing_secret); // "whsec_..."
```

### `.delete(id)` → `Promise<void>`

```typescript
await recurrente.webhookEndpoints.delete("whe_abc123");
```

#### `WebhookEndpointResponse`

```typescript
interface WebhookEndpointResponse {
  id:             string;
  url:            string;
  description:    string | null;
  status:         "enabled" | "disabled";
  signing_secret: string;  // only populated on .create()
  live_mode:      boolean;
  created_at:     string;
  updated_at:     string;
}
```

---

## `RecurrenteWebhooks` (static)

### `.verifySignature(rawBody, headers, secret, options?)` → `Promise<boolean>`

Verifies the authenticity of an incoming webhook using HMAC-SHA256 (Svix protocol).
Uses `crypto.subtle.verify` — **constant-time comparison**, immune to timing attacks.
Rejects events older than 5 minutes by default (**replay-attack prevention**).

```typescript
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const isValid = await RecurrenteWebhooks.verifySignature(
  rawBody,   // string — the unparsed request body
  {
    "svix-id":        headers["svix-id"],
    "svix-timestamp": headers["svix-timestamp"],
    "svix-signature": headers["svix-signature"],
  },
  process.env.RECURRENTE_WEBHOOK_SECRET!, // "whsec_..."
  { maxAgeSeconds: 300 }, // optional — default 300 (5 min), Infinity to disable
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rawBody` | `string` | Raw (un-parsed) request body. Do NOT re-serialize. |
| `headers` | `WebhookHeaders` | Object with the three `svix-*` headers |
| `secret` | `string` | `whsec_<base64>` signing secret |
| `options.maxAgeSeconds` | `number` | Max age in seconds (default `300`, `Infinity` to disable) |

Returns `false` (never throws) on invalid input, missing headers, or expired events.

---

---

## `recurrente.account`

### `.retrieve()` → `Promise<AccountDetails>`

Obtén información sobre tu cuenta de Recurrente.

```typescript
const account = await recurrente.account.retrieve();
console.log(account.name, account.account_type);
```

---

## `recurrente.test`

### `.credentials()` → `Promise<TestResponse>`

Prueba tus credenciales de autenticación. Útil para validar que tus llaves están correctas.

```typescript
const test = await recurrente.test.credentials();
console.log(test.message); // "Hello La Surf Office 🌎"
```

---

## `recurrente.transfers`

### `.create(data)` → `Promise<Transfer>`

Envía dinero desde tu cuenta a otra cuenta de Recurrente.

```typescript
const transfer = await recurrente.transfers.create({
  amount_in_cents: 10000,   // Q100.00
  currency:        "GTQ",
  recipient_id:    "recurrente" // handle (@) de la cuenta destinataria
});
```

---

## `recurrente.users`

### `.create(data)` → `Promise<User>`

Crea un usuario que puede ser asociado a checkouts.

```typescript
const user = await recurrente.users.create({
  email: "cliente@ejemplo.com"
});
```

---

## `recurrente.terminalSessionCommands`

### `.create(data)` → `Promise<TerminalSessionCommand>`

Envía un comando de cobro a una terminal POS.

```typescript
const command = await recurrente.terminalSessionCommands.create({
  terminal_id:     "trm_abc123",
  external_id:     "order-1234", // Idempotency key
  amount_in_cents: 5000,
  currency:        "GTQ"
});
console.log(command.checkout_url);
```

---

## `recurrente.paymentIntents`

### `.update(id, data)` → `Promise<PaymentIntent>`

Adjunta una URL de factura fiscal a un payment intent exitoso.

```typescript
const updated = await recurrente.paymentIntents.update("pa_123", {
  payment_intent: {
    tax_invoice_url: "https://facturas.com/fac_123.pdf"
  }
});
```

---

## `recurrente.coupons`

### `.list(params?)` → `Promise<Page<Coupon>>`

```typescript
const page = await recurrente.coupons.list();
```

### `.retrieve(id)` → `Promise<Coupon>`

```typescript
const coupon = await recurrente.coupons.retrieve("coup_abc123");
```

### `.create(data)` → `Promise<Coupon>`

```typescript
const coupon = await recurrente.coupons.create({
  name: "VERANO25",
  discount_mode: "code",
  amount_off_in_cents: 1500
});
```

### `.update(id, data)` → `Promise<Coupon>`

```typescript
const updated = await recurrente.coupons.update("coup_abc123", {
  display_name: "Promo Verano"
});
```

### `.archive(id)` → `Promise<void>`

```typescript
await recurrente.coupons.archive("coup_abc123");
```

---

## Error Handling

All methods throw `RecurrenteError` on non-2xx responses.

```typescript
import { RecurrenteError } from "@rodmarzavala/recurrente-sdk";

try {
  await recurrente.checkouts.retrieve("ch_nonexistent");
} catch (error) {
  if (error instanceof RecurrenteError) {
    console.error(error.statusCode); // 404
    console.error(error.message);    // "Not found"
    console.error(error.body);       // { message: "Not found" }
    console.error(error.body.errors); // { field: ["error msg"] } on 422
  }
}
```

### `RecurrenteError`

```typescript
class RecurrenteError extends Error {
  statusCode: number;                 // HTTP status (0 = network error / timeout)
  body: {
    message: string;
    errors?: Record<string, string[]>; // per-field validation errors
  };
}
```

### Retry behavior

- Retries `429` and `5xx` with full-jitter exponential backoff
- Delay: `random(0, min(30s, 1000ms × 2ⁿ))`
- Honors `Retry-After` header when present
- Max **3 retries** (configurable via `maxRetries`)
- **4xx errors are never retried**
- **Same idempotency key reused** across all retry attempts to prevent duplicate charges

### Timeout

Requests time out after **30 seconds** by default. Override globally or per-request:

```typescript
// Global
const recurrente = new Recurrente({ ..., timeout: 10_000 }); // 10 s

// Per-request (not yet exposed on modules — use RecurrenteClient directly)
```
