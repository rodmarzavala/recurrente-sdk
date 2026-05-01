/**
 * Vitest global setup — makes Web Crypto available as a global in Node 18.
 *
 * In Node ≥ 19 `crypto` is a true global; in Node 18 it lives on
 * `globalThis.crypto` but is not automatically injected into the module
 * scope that test files see.  This shim ensures all three globals
 * (`crypto`, `globalThis.crypto`, and the underlying `webcrypto` object)
 * resolve correctly regardless of Node version.
 */
import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  // @ts-expect-error — types say readonly, but this is a test-only shim
  globalThis.crypto = webcrypto;
}
