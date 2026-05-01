import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import path from "node:path";

export async function initCommand() {
  const rl = readline.createInterface({ input, output });

  console.log(`
=========================================
⚡️ Recurrente SDK Config Wizard ⚡️
=========================================
This wizard will help you set up Recurrente 
in your local environment.
`);

  // 1. Prompt for keys
  let envContent = "";
  const hasEnv = fs.existsSync(".env");
  if (hasEnv) {
    envContent = fs.readFileSync(".env", "utf8");
    if (envContent.includes("RECURRENTE_PUBLIC_KEY")) {
      console.log("✅ Found RECURRENTE_PUBLIC_KEY in .env");
    }
  }

  const pk = await rl.question("Enter your Recurrente Public Key (pk_test_...): ");
  const sk = await rl.question("Enter your Recurrente Secret Key (sk_test_...): ");

  if (pk || sk) {
    let toAppend = "\n# Recurrente SDK\n";
    if (pk) toAppend += `RECURRENTE_PUBLIC_KEY="${pk}"\n`;
    if (sk) toAppend += `RECURRENTE_SECRET_KEY="${sk}"\n`;

    fs.appendFileSync(".env", toAppend);
    console.log("✅ Appended keys to .env file");
  }

  console.log("\n");

  // 2. Select framework
  const framework = await rl.question(
    "Which framework are you using?\n[1] Next.js App Router\n[2] Express.js\n[3] Skip scaffolding\n\nChoose (1/2/3): "
  );

  let targetPath = "";
  let fileContent = "";

  if (framework === "1") {
    // Next.js
    const useSrc = fs.existsSync(path.join(process.cwd(), "src", "app")) ? "src/app" : "app";
    targetPath = path.join(process.cwd(), useSrc, "api", "webhooks", "recurrente", "route.ts");
    fileContent = `import { NextRequest, NextResponse } from "next/server";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    const event = await RecurrenteWebhooks.constructEvent(
      rawBody,
      {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      },
      process.env.RECURRENTE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.succeeded":
        console.log("Checkout paid:", event.data.id);
        break;
      // Add more cases here
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
`;
  } else if (framework === "2") {
    // Express
    targetPath = path.join(process.cwd(), "webhook.ts");
    fileContent = `import express from "express";
import { RecurrenteWebhooks } from "@rodmarzavala/recurrente-sdk";

const app = express();

app.post(
  "/webhooks/recurrente",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const rawBody = req.body.toString("utf-8");

    try {
      const event = await RecurrenteWebhooks.constructEvent(
        rawBody,
        {
          "svix-id": req.headers["svix-id"] as string,
          "svix-timestamp": req.headers["svix-timestamp"] as string,
          "svix-signature": req.headers["svix-signature"] as string,
        },
        process.env.RECURRENTE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        case "checkout.succeeded":
          console.log("Checkout paid:", event.data.id);
          break;
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      return res.status(401).send("Unauthorized");
    }
  }
);

app.listen(3000, () => console.log("Server running on port 3000"));
`;
  }

  if (targetPath) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, fileContent);
    console.log(`✅ Scaffolded webhook handler at: ${path.relative(process.cwd(), targetPath)}`);
  }

  console.log(`
🎉 Setup complete!

To start receiving webhooks locally, run:
  npx recurrente listen --forward-to http://localhost:3000/api/webhooks/recurrente

Happy coding!
`);

  rl.close();
}
