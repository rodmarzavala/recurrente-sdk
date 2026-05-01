import { parseArgs } from "node:util";
import { Recurrente } from "../../index.js";
import crypto from "node:crypto";
import fs from "node:fs";

export async function listenCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      "forward-to": { type: "string" },
    },
  });

  const forwardTo = values["forward-to"] || "http://localhost:3000/api/webhooks";

  // Attempt to load .env
  if (fs.existsSync(".env")) {
    const env = fs.readFileSync(".env", "utf8");
    env.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
          val = val.replace(/\\n/gm, "\n");
        }
        val = val.replace(/(^['"]|['"]$)/g, "").trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }

  const publicKey = process.env.RECURRENTE_PUBLIC_KEY;
  const secretKey = process.env.RECURRENTE_SECRET_KEY;
  const localWebhookSecret = process.env.RECURRENTE_WEBHOOK_SECRET;

  if (!publicKey || !secretKey) {
    console.error("❌ Missing RECURRENTE_PUBLIC_KEY or RECURRENTE_SECRET_KEY in environment or .env file.");
    process.exit(1);
  }

  if (!localWebhookSecret) {
    console.warn("⚠️  No RECURRENTE_WEBHOOK_SECRET found in .env. We won't be able to re-sign webhooks for local validation.");
  }

  const recurrente = new Recurrente({ publicKey, secretKey });

  console.log("🚀 Starting Recurrente Webhook Forwarder...");

  // 1. Generate Smee URL
  const channelId = crypto.randomUUID().replace(/-/g, "").substring(0, 20);
  const smeeUrl = `https://smee.io/${channelId}`;

  // 2. Create Webhook on Recurrente
  let endpointId: string | undefined;
  try {
    const endpoint = await recurrente.webhookEndpoints.create({
      url: smeeUrl,
      description: "Recurrente CLI Local Forwarder",
    });
    endpointId = endpoint.id;
    console.log(`✅ Created temporary webhook endpoint on Recurrente: ${endpointId}`);
    console.log(`📡 Forwarding events to ${forwardTo}`);
  } catch (err: any) {
    console.error("❌ Failed to create webhook endpoint on Recurrente:", err.message || err);
    process.exit(1);
  }

  // Cleanup on exit
  const cleanup = async () => {
    if (endpointId) {
      console.log("\n🧹 Cleaning up temporary webhook endpoint...");
      try {
        await recurrente.webhookEndpoints.delete(endpointId);
        console.log("✅ Cleanup successful. Goodbye!");
      } catch (err: any) {
        console.error("❌ Failed to delete endpoint:", err.message);
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // 3. Connect to Smee via Server-Sent Events (SSE)
  try {
    const res = await fetch(smeeUrl, { headers: { accept: "text/event-stream" } });
    if (!res.body) throw new Error("No body in stream");
    
    // Polyfill for Node.js fetch stream reading
    // @ts-ignore
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    console.log("⏳ Waiting for events...");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let splitIndex;
      while ((splitIndex = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, splitIndex);
        buffer = buffer.slice(splitIndex + 2);

        if (chunk.includes("event: req")) {
          const dataMatch = chunk.match(/data:\s*(.*)/);
          if (dataMatch && dataMatch[1]) {
            try {
              const payload = JSON.parse(dataMatch[1]);
              await forwardEvent(payload, forwardTo, localWebhookSecret);
            } catch (err) {
              console.error("Error parsing/forwarding event:", err);
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("❌ Stream error:", err.message);
    await cleanup();
  }
}

async function forwardEvent(payload: any, forwardTo: string, localSecret?: string) {
  const originalHeaders = payload.headers || {};
  const bodyString = JSON.stringify(payload.body || {});
  const eventType = payload.body?.event_type || "unknown";
  
  console.log(`\n➡️  Received event: ${eventType} (${payload.body?.id || "no-id"})`);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "svix-id": originalHeaders["svix-id"] || crypto.randomUUID(),
    "svix-timestamp": originalHeaders["svix-timestamp"] || Math.floor(Date.now() / 1000).toString(),
  };

  // Re-sign webhook if local secret is provided
  if (localSecret && localSecret.startsWith("whsec_")) {
    const toSign = `${headers["svix-id"]}.${headers["svix-timestamp"]}.${bodyString}`;
    
    // Recreate HMAC using Node crypto (Svix protocol)
    const secretBuffer = Buffer.from(localSecret.replace("whsec_", ""), "base64");
    const hmac = crypto.createHmac("sha256", secretBuffer);
    hmac.update(toSign);
    const signature = hmac.digest("base64");
    
    headers["svix-signature"] = `v1,${signature}`;
  } else {
    // Pass original signature if no local secret
    headers["svix-signature"] = originalHeaders["svix-signature"] || "";
  }

  try {
    const start = Date.now();
    const res = await fetch(forwardTo, {
      method: "POST",
      headers,
      body: bodyString,
    });
    const elapsed = Date.now() - start;
    
    if (res.ok) {
      console.log(`✅ Forwarded [${res.status}] in ${elapsed}ms`);
    } else {
      const errText = await res.text();
      console.error(`❌ Forwarded [${res.status}] in ${elapsed}ms - App rejected event`);
      console.error(`   Response: ${errText.substring(0, 200)}`);
    }
  } catch (err: any) {
    console.error(`❌ Failed to forward to ${forwardTo}: ${err.message}`);
    console.error(`   Is your local server running?`);
  }
}
