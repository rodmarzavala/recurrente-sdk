import express from "express";
import { Recurrente, RecurrenteEvent } from "recurrente-sdk";

const app = express();
const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

// Middleware for parsing raw body is required to verify webhook signatures
app.post(
  "/webhooks/recurrente",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["recurrente-signature"] as string;

    try {
      // Verify signature and parse the payload into the type-safe RecurrenteEvent
      const event: RecurrenteEvent = recurrente.webhooks.constructEvent(
        req.body,
        signature,
        process.env.RECURRENTE_WEBHOOK_SECRET!
      );

      // We can use TypeScript discriminated unions for type-safe handling
      switch (event.type) {
        case "checkout.succeeded":
          console.log(`Payment succeeded for checkout: ${event.data.id}`);
          console.log(`Amount paid: ${event.data.amount_in_cents} cents`);
          break;

        case "subscription.canceled":
          console.log(`Subscription ${event.data.id} was canceled.`);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook signature verification failed.", err);
      res.status(400).send("Webhook Error: Invalid Signature");
    }
  }
);

// Create a checkout with custom idempotency
app.post("/api/checkout", express.json(), async (req, res) => {
  try {
    const checkout = await recurrente.checkouts.create(
      {
        items: [{ price_id: "prod_12345", quantity: 1 }],
        success_url: "https://mysite.com/success",
        cancel_url: "https://mysite.com/cancel",
      },
      {
        // Prevent duplicate checkouts for the same user cart
        idempotencyKey: req.body.cartId,
        // Optional timeout for slow network paths
        timeout: 10000, 
      }
    );

    res.json({ url: checkout.checkout_url });
  } catch (error) {
    res.status(500).json({ error: "Failed to create checkout" });
  }
});

app.listen(3000, () => console.log("Server ready on port 3000"));
