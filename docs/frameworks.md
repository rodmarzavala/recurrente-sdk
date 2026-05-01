# Ejemplos por Framework

El SDK de Recurrente está diseñado para ser **Edge-first**. Esto significa que jala nítido en frameworks modernos que despliegan a Vercel Edge, Cloudflare Workers o Deno. ¿Por qué? Porque usa el `fetch` y `crypto.subtle` nativo de los navegadores, saltándose los típicos dolores de cabeza de usar módulos pesados de Node.js.

Aquí te dejamos cómo instanciar y usar el SDK en los frameworks más populares.

## Next.js (App Router)

En Next.js, por lo general usas `process.env` para acceder a tus variables de entorno. Acuérdate que tu llave secreta (Secret Key) solo debe usarse del lado del servidor (Server Components o Server Actions).

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
    success_url: "https://tudominio.com/gracias",
    cancel_url: "https://tudominio.com/cancelado",
  });

  redirect(checkout.checkout_url);
}
```

## Astro

Astro usa `import.meta.env` de Vite para las variables de entorno. Al usar la Web Crypto API nativa, verificar webhooks vuela en Cloudflare Pages o Vercel Edge usando los Endpoints de Astro.

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
    return new Response("No autorizado", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  console.log("Se recibió un webhook chilero:", event.event_type);

  return new Response("Nítido", { status: 200 });
};
```

## React (Client-Side)

Si no tienes un backend y todo lo haces desde el front, puedes armar los checkouts directo en el navegador usando el **Modo Público**. Si le mandas un string vacío en `secretKey` y configuras `{ publicOnly: true }`, el SDK desactiva todos los métodos peligrosos (como listar clientes) pero sí te deja armar links de pago de forma segura.

```tsx
import { useState } from "react";
import { Recurrente } from "@rodmarzavala/recurrente-sdk";

// Ojo: Asegúrate que el prefijo de tu variable cuadre con tu framework 
// (ej. NEXT_PUBLIC_ o VITE_)
const recurrente = new Recurrente({
  publicKey: import.meta.env.VITE_RECURRENTE_PUBLIC_KEY,
  secretKey: "", // Déjalo vacío si estás en el cliente
});

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { checkout_url } = await recurrente.checkouts.create({
        items: [{ name: "Zapatos chilísimos", amount_in_cents: 50000, currency: "GTQ", quantity: 1 }],
        success_url: window.location.origin + "/gracias",
        cancel_url: window.location.origin + "/cancelado"
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
      {loading ? "Cargando..." : "Pagar Q500"}
    </button>
  );
}
```
