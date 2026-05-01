import { Recurrente, isRecurrenteError } from "recurrente-sdk";

export interface Env {
  RECURRENTE_PUBLIC_KEY: string;
  RECURRENTE_SECRET_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Instantiate SDK with Cloudflare env variables
    const recurrente = new Recurrente({
      publicKey: env.RECURRENTE_PUBLIC_KEY,
      secretKey: env.RECURRENTE_SECRET_KEY,
    });

    try {
      // List the last 5 active products
      const productsPage = await recurrente.products.list({ per_page: 5 });

      return new Response(JSON.stringify(productsPage.data), {
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      if (isRecurrenteError(error)) {
        return new Response(JSON.stringify({ error: error.body.message }), {
          status: error.statusCode,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
