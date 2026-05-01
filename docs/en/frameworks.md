# Framework Examples

The Recurrente SDK is designed to be **Edge-first**. This means it works seamlessly in modern frameworks that deploy to Vercel Edge, Cloudflare Workers, or Deno, because it relies on standard `fetch` and `crypto.subtle` instead of Node.js polyfills.

Below are examples of how to initialize and use the SDK in popular frameworks.

## Next.js (App Router)

In Next.js, you typically use `process.env` to access environment variables. Ensure your secret key is only accessed in Server Components or Server Actions.

```typescript
// app/actions/checkout.ts
"use server"

import { Recurrente } from "@rodmarzavala/recurrente-sdk";
import { redirect } from "next/navigation";

const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

export async function createCheckoutSession(formData: FormData) {
  const checkout = await recurrente.checkouts.create({
    items: [
      {
        name: "Suscripción Mensual",
        amount_in_cents: 10000, // Q100.00
        currency: "GTQ",
        quantity: 1,
      },
    ],
    success_url: "https://yourdomain.com/success",
    cancel_url: "https://yourdomain.com/cancel",
  });

  redirect(checkout.checkout_url);
}
```

## Astro

Astro uses Vite's `import.meta.env` for environment variables. Because the SDK uses the Web Crypto API natively, webhook verification runs perfectly on Cloudflare Pages or Vercel Edge via Astro Endpoints.

```typescript
// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  
  const isValid = await RecurrenteWebhooks.verifySignature(
    rawBody,
    {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    },
    import.meta.env.RECURRENTE_WEBHOOK_SECRET
  );

  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  console.log("Webhook received:", event.event_type);

  return new Response("OK", { status: 200 });
};
```

## React (Client-Side)

If you don't have a backend, you can generate checkouts directly from the browser using the **Public Mode**. By leaving the `secretKey` empty and passing `{ publicOnly: true }` to the method, the SDK prevents accidental access to sensitive methods (like viewing customers) while allowing checkout creation.

```tsx
import { useState } from "react";
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

// Note: Ensure your environment variable prefix matches your framework 
// (e.g. NEXT_PUBLIC_ or VITE_)
const recurrente = new Recurrente({
  publicKey: import.meta.env.VITE_RECURRENTE_PUBLIC_KEY,
  secretKey: "", // Left empty for client-side usage
});

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { checkout_url } = await recurrente.checkouts.create({
        items: [{ name: "Zapatos", amount_in_cents: 50000, currency: "GTQ", quantity: 1 }],
        success_url: window.location.origin + "/success",
        cancel_url: window.location.origin + "/cancel"
      }, { publicOnly: true });

      window.location.href = checkout_url;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? "Cargando..." : "Pay Q500"}
    </button>
  );
}
```
