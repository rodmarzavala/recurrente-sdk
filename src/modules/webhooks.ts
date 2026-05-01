// ─────────────────────────────────────────────────────────────────────────────
// src/modules/webhooks.ts
//
// Signature verification following the Svix protocol used by Recurrente.
// Uses Web Crypto API (globalThis.crypto.subtle) — Edge/Serverless compatible.
// ─────────────────────────────────────────────────────────────────────────────

import type { WebhookHeaders } from "../types/index.js";

export type { WebhookHeaders };

const MAX_TIMESTAMP_DIFF_SECONDS = 300; // 5 minutes (Svix default)

export class RecurrenteWebhooks {
  /**
   * Verifies the HMAC-SHA256 signature of a Recurrente webhook.
   *
   * @param rawBody       Raw request body as a **string** — do NOT parse as JSON first.
   * @param headers       The `svix-id`, `svix-timestamp`, and `svix-signature` headers.
   * @param secret        Your webhook signing secret (`whsec_...`).
   * @param options.maxAgeSeconds  Reject events older than this many seconds (default 300).
   *                               Set to `Infinity` or `0` to disable.
   * @returns `true` if valid, `false` otherwise.
   */
  static async verifySignature(
    rawBody: string,
    headers: WebhookHeaders,
    secret: string,
    options?: { maxAgeSeconds?: number },
  ): Promise<boolean> {
    try {
      const msgId        = headers["svix-id"];
      const msgTimestamp = headers["svix-timestamp"];
      const msgSignature = headers["svix-signature"];

      if (!msgId || !msgTimestamp || !msgSignature) return false;

      // ── 1. Timestamp validation (replay-attack prevention) ─────────────────
      const maxAge = options?.maxAgeSeconds ?? MAX_TIMESTAMP_DIFF_SECONDS;

      if (maxAge > 0 && isFinite(maxAge)) {
        const tsSeconds = parseInt(msgTimestamp, 10);
        if (isNaN(tsSeconds)) return false;

        const nowSeconds   = Math.floor(Date.now() / 1000);
        const diffSeconds  = Math.abs(nowSeconds - tsSeconds);

        if (diffSeconds > maxAge) return false;
      }

      // ── 2. Decode the signing key ──────────────────────────────────────────
      const secretBase64 = secret.startsWith("whsec_")
        ? secret.slice("whsec_".length)
        : secret;

      const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));
      const keyBuffer   = secretBytes.buffer.slice(
        secretBytes.byteOffset,
        secretBytes.byteOffset + secretBytes.byteLength,
      ) as ArrayBuffer;

      const cryptoKey = await globalThis.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );

      // ── 3. Build the signed string ─────────────────────────────────────────
      const signedContent  = `${msgId}.${msgTimestamp}.${rawBody}`;
      const signedBytes    = new TextEncoder().encode(signedContent);

      // ── 4. Extract expected signatures (supports key rotation) ────────────
      const signatures = msgSignature
        .split(" ")
        .filter((s) => s.startsWith("v1,"))
        .map((s) => {
          try {
            const b64  = s.slice("v1,".length);
            const raw  = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            return raw.buffer.slice(
              raw.byteOffset,
              raw.byteOffset + raw.byteLength,
            ) as ArrayBuffer;
          } catch {
            return null;
          }
        })
        .filter((s): s is ArrayBuffer => s !== null);

      if (signatures.length === 0) return false;

      // ── 5. Constant-time verification for each signature ──────────────────
      for (const expected of signatures) {
        const valid = await globalThis.crypto.subtle.verify(
          "HMAC",
          cryptoKey,
          expected,
          signedBytes,
        );
        if (valid) return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
