# @rodmarzavala/recurrente-sdk

**SDK no oficial de TypeScript para la API REST de [Recurrente](https://recurrente.com).**  
Zero dependencias · Edge & Serverless · Completamente tipado

[![npm version](https://img.shields.io/npm/v/@rodmarzavala%2Frecurrente-sdk?color=4f46e5&style=flat-square)](https://www.npmjs.com/package/@rodmarzavala/recurrente-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@rodmarzavala%2Frecurrente-sdk?color=4f46e5&style=flat-square)](https://www.npmjs.com/package/@rodmarzavala/recurrente-sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-4f46e5?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/rodmarzavala/recurrente-sdk/ci.yml?label=CI&style=flat-square)](https://github.com/rodmarzavala/recurrente-sdk/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-4f46e5?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## ¿Por qué este SDK?

| Feature | Detalle |
|---------|---------|
| ⚡️ **Edge-first** | Usa solo Web APIs estándar — funciona en Cloudflare Workers, Vercel Edge, Deno, Bun y Node.js ≥ 18 sin cambios |
| 📦 **Zero dependencias** | `fetch` nativo + Web Crypto API — nada en `dependencies` |
| 🛡️ **Seguro por defecto** | Verificación de webhooks con `crypto.subtle.verify` (tiempo constante) + protección contra replay attacks (ventana 5 min) |
| 💪 **Resiliente** | Reintentos con exponential backoff para 429 & 5xx · soporte `Retry-After` · timeout de 30s via `AbortController` |
| 🎯 **100% tipado** | TypeScript estricto en todo — `noImplicitAny`, sin `any` |
| 🔑 **Idempotente** | `Idempotency-Key` generado automáticamente y reutilizado en reintentos — sin cobros dobles |
| 📋 **Paginación** | Todos los endpoints de lista retornan `Page<T>` con helpers `pageIterator()` y `autoPagingToArray()` |

---

## Instalación

```bash
npm install @rodmarzavala/recurrente-sdk
# o
pnpm add @rodmarzavala/recurrente-sdk
# o
yarn add @rodmarzavala/recurrente-sdk
```

> **Requisito mínimo:** Node.js ≥ 18, Deno ≥ 1.38, Bun ≥ 1.0, o cualquier runtime con [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) y [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).

---

## Quick Start

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

// Crea un checkout y redirige al cliente
const checkout = await recurrente.checkouts.create({
  items: [
    {
      name: "Plan Pro",
      amount_in_cents: 29900, // Q299.00
      currency: "GTQ",
      quantity: 1,
    },
  ],
  success_url: "https://tudominio.com/gracias",
  cancel_url: "https://tudominio.com/cancelar",
});

redirect(checkout.checkout_url);
```

---

## Módulos disponibles

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
// Reembolso total
const refund = await recurrente.refunds.create({ checkout_id: "ch_abc123" });
// Reembolso parcial
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

### Webhook Endpoints

```typescript
const endpoint = await recurrente.webhookEndpoints.create({
  url: "https://myapp.com/webhooks/recurrente",
});
console.log(endpoint.signing_secret); // ¡guárdalo — solo se muestra una vez!
await recurrente.webhookEndpoints.delete(endpoint.id);
```

### Paginación

```typescript
import { pageIterator, autoPagingToArray } from "@rodmarzavala/recurrente-sdk";

// Iterar página por página
for await (const page of pageIterator((p) => recurrente.products.list(p))) {
  page.data.forEach((p) => console.log(p.name));
}

// Obtener todos los registros de una sola vez
const all = await autoPagingToArray((p) => recurrente.customers.list(p));
```

### Verificación de Webhooks

Verifica que los webhooks entrantes son auténticos — funciona en cualquier runtime.

```typescript
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const isValid = await RecurrenteWebhooks.verifySignature(
  rawBody,   // ⚠️ string crudo — NO JSON parseado
  {
    "svix-id":        req.headers["svix-id"],
    "svix-timestamp": req.headers["svix-timestamp"],
    "svix-signature": req.headers["svix-signature"],
  },
  process.env.RECURRENTE_WEBHOOK_SECRET!, // "whsec_..."
);

if (!isValid) return res.status(401).send("Unauthorized");
```

### Manejo de errores

```typescript
import { RecurrenteError } from "@rodmarzavala/recurrente-sdk";

try {
  await recurrente.checkouts.retrieve("ch_nonexistent");
} catch (err) {
  if (err instanceof RecurrenteError) {
    console.error(err.statusCode); // 404
    console.error(err.message);    // mensaje de error de la API
    console.error(err.body);       // body completo del error
  }
}
```

### Reintentos automáticos

El cliente reintenta `429` (rate limit) y `5xx` automáticamente con backoff exponencial (max 3 reintentos, cap 30s). Configurable:

```typescript
const recurrente = new Recurrente({
  publicKey: "...",
  secretKey: "...",
  maxRetries: 5, // o 0 para deshabilitar
});
```

---

## Documentación

📖 **[rodmarzavala.github.io/recurrente-sdk](https://rodmarzavala.github.io/recurrente-sdk/)** — Documentación completa en español e inglés.

| Guía | Descripción |
|------|-------------|
| [Inicio Rápido](https://rodmarzavala.github.io/recurrente-sdk/getting-started) | Instalación, primera request, sandbox vs producción |
| [API Reference](https://rodmarzavala.github.io/recurrente-sdk/api-reference) | Todos los métodos, parámetros e interfaces TypeScript |
| [Webhooks](https://rodmarzavala.github.io/recurrente-sdk/webhooks) | Verificación, tipos de eventos, ejemplos por framework |
| [Frameworks](https://rodmarzavala.github.io/recurrente-sdk/frameworks) | Next.js, Astro, React |
| [Docs de Recurrente](https://docs.recurrente.com) | Documentación oficial de la API de Recurrente |

---

## Compatibilidad

| Runtime | Versión mínima | Estado |
|---------|---------------|--------|
| Node.js | 18.0.0 | ✅ Soportado |
| Cloudflare Workers | Cualquiera | ✅ Soportado |
| Vercel Edge Functions | Cualquiera | ✅ Soportado |
| Deno | 1.38.0 | ✅ Soportado |
| Bun | 1.0.0 | ✅ Soportado |
| Browser | Moderno (ES2022+) | ✅ Soportado |

---

## Contribuir

¡Todas las contribuciones son bienvenidas! Ya sea un fix de bug, un módulo nuevo, o una typo en los docs.

👉 Lee [CONTRIBUTING.md](./CONTRIBUTING.md) para empezar.

```bash
git clone https://github.com/rodmarzavala/recurrente-sdk.git
cd recurrente-sdk
npm install
npm test          # 31 tests, todos deben pasar
npm run typecheck # cero errores
```

---

## License

MIT — ver [LICENSE](./LICENSE).

---

> **Disclaimer:** Este es un proyecto open-source independiente y no está oficialmente afiliado ni respaldado por Recurrente.
