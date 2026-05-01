import { NextResponse } from "next/server";
import { Recurrente, isRecurrenteError } from "recurrente-sdk";

// Recurrente SDK is 100% native fetch and Edge-compatible.
// You can force Edge runtime in Next.js API Routes:
export const runtime = "edge";

const recurrente = new Recurrente({
  publicKey: process.env.RECURRENTE_PUBLIC_KEY!,
  secretKey: process.env.RECURRENTE_SECRET_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // The SDK works perfectly in the Edge Runtime (no Node.js crypto dependencies)
    const checkout = await recurrente.checkouts.create({
      items: [
        {
          price_id: body.priceId,
        },
      ],
      success_url: "https://mysite.com/success",
      cancel_url: "https://mysite.com/cancel",
    });

    return NextResponse.json({ url: checkout.checkout_url });
    
  } catch (error) {
    // Utilize the isRecurrenteError type guard for safe error handling
    if (isRecurrenteError(error)) {
      console.error(`Recurrente Error [${error.statusCode}]:`, error.body.message);
      
      // We can easily return the status code emitted by the API
      return NextResponse.json(
        { error: error.body.message },
        { status: error.statusCode }
      );
    }

    // Fallback for non-SDK errors
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
