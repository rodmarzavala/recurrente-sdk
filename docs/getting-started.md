# Empezar a codear

> **Lo que necesitas:** Node.js ≥ 18, Deno ≥ 1.38, Bun ≥ 1.0, o cualquier entorno que soporte
> `fetch` nativo y Web Crypto API (Cloudflare Workers, Vercel Edge, etc.)

## Instalación

Pégale este comando a tu terminal:

```bash
npm install recurrente-sdk
# o si usas pnpm
pnpm add recurrente-sdk
# o yarn
yarn add recurrente-sdk
```

## Tu primera petición

### 1. Conseguir tus llaves (API keys)

Entra a [app.recurrente.com](https://app.recurrente.com) → **Configuración → API Keys**.

Ahí vas a toparte con dos tipos de llaves:

| Tipo de Llave | Empieza con | ¿Para qué sirve? |
|----------|--------|-----|
| Pública | `pk_live_` / `pk_test_` | Para crear checkouts (segura para usar en el frontend) |
| Secreta | `sk_live_` / `sk_test_` | Para todo lo demás (Ojo: ¡solo úsala en tu backend!) |

> ⚠️ **Pilas aquí:** Nunca vayas a quemar (hardcodear) tu llave secreta en el código del cliente o en un repo público de GitHub.

### 2. Instanciar el cliente

En tu código, solo necesitas llamarlo así:

```typescript
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});
```

### 3. Crear un link de pago (Checkout)

```typescript
const checkout = await recurrente.checkouts.create({
  items: [
    {
      name: "Plan Pro",
      amount_in_cents: 29900, // Q299.00 (siempre va en centavos)
      currency: "GTQ",
      quantity: 1,
    },
  ],
  success_url: "https://tudominio.com/gracias",
  cancel_url: "https://tudominio.com/precios",
});

// Aquí rediriges a tu cliente para que pague
console.log(checkout.checkout_url);
```

### 4. Verificar webhooks (sin morir en el intento)

```typescript
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

// Express / Hono / Next.js — usa el body CRUDO (como string)
app.post("/webhooks/recurrente", async (req, res) => {
  const isValid = await RecurrenteWebhooks.verifySignature(
    req.rawBody,                        // string crudo, NO el JSON parseado
    {
      "svix-id":        req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    },
    process.env.RECURRENTE_WEBHOOK_SECRET!, // empieza con whsec_...
  );

  if (!isValid) return res.status(401).send("No autorizado mano");

  const event = req.body;
  console.log(event.event_type); // "payment_intent.succeeded"

  res.status(200).send("Nítido");
});
```

---

## Variables de Entorno

Lo más chilero es armar un archivo `.env` (¡y asegurarte de que no se vaya en el commit!):

```bash
# .env
RECURRENTE_PUBLIC_KEY=pk_live_...
RECURRENTE_SECRET_KEY=sk_live_...
RECURRENTE_WEBHOOK_SECRET=whsec_...
```

Metelo a tu `.gitignore` de una vez:

```bash
echo ".env" >> .gitignore
```

---

## Sandbox vs Producción

La URL de la API es exactamente la misma para pruebas que para el mundo real. Lo único que le dice a Recurrente en qué modo estás, es el prefijo de tus llaves:

| Prefijo de la llave | Modo | ¿Dinero real? | ¿Manda webhooks? |
|------------|------|-------------|-----------|
| `pk_test_` / `sk_test_` | Sandbox (Pruebas) | ❌ No | ❌ No |
| `pk_live_` / `sk_live_` | Producción | ✅ Sí | ✅ Sí |

Tarjeta de prueba para que no gastes tu saldo: `4242 4242 4242 4242` (cualquier fecha futura y cualquier CVV).

---

## ¿Qué sigue?

- [Referencia de la API](./api-reference.md) — todos los métodos, parámetros y tipos.
- [Guía de Webhooks](./webhooks.md) — tipos de eventos y mejores prácticas.
- [Contribuir](https://github.com/rodmarzavala/recurrente-sdk/blob/main/CONTRIBUTING.md) — cómo ayudar a mejorar el SDK o reportar clavos.
