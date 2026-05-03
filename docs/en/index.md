---
layout: home

hero:
  name: Recurrente SDK
  text: The TypeScript SDK for Recurrente.
  tagline: Edge-first architecture, zero dependencies, and strictly typed. Build subscriptions and payments for Guatemala in minutes.
  actions:
    - theme: brand
      text: Get Started
      link: /en/getting-started
    - theme: alt
      text: API Reference
      link: /en/api-reference

features:
  - title: 100% Edge-First
    details: Runs flawlessly on Vercel Edge, Cloudflare Workers, Next.js, Astro, and Bun. Forget about Node.js "crypto" polyfill errors.
    icon: 
  - title: Zero Dependencies
    details: Uses native fetch and the Web Crypto API. Your bundle stays tiny, secure, and lightning fast.
    icon: 
  - title: Built for Resilience
    details: Exponential backoff retries for 429/5xx errors, auto-generated idempotency keys, and AbortController timeouts.
    icon: 
  - title: 100% Type Safe
    details: Written in strict TypeScript. Every request and response payload is strongly typed for perfect IntelliSense.
    icon: 
---

## Why use this SDK instead of a raw "fetch"?

Building payment integrations by hand using raw `fetch` is risky. Here are 4 critical technical reasons why this SDK saves you from massive headaches:

### 1. Webhook Verification Hell
Recurrente uses Svix for webhooks. Validating cryptographic signatures by hand means dealing with HMAC hashes, timestamps, and replay attacks. Our SDK reduces this to **a single line of code** (`verifySignature`) that runs natively on the Edge, without needing to install the heavy official Svix library.

### 2. Automatic Idempotency (No Double Charges)
If a user taps "Pay" and their connection drops, the app might retry the request and charge them twice. This SDK silently injects a unique `Idempotency-Key` (UUID v4) into every mutation (POST/DELETE), protecting you and your customers without any extra code on your end.

### 3. Resilience Against Downtime
Do APIs throw 429 (Too Many Requests) or 500 errors? The SDK features a smart client with *Exponential Backoff*. It will wait a few milliseconds and automatically retry the request before throwing an ugly error to the end user.

### 4. Painless Pagination
If you have over 100 payments, fetching them all manually forces you to write ugly `while` loops parsing cursors. Here, you simply use the `autoPagingToArray` helper and the SDK makes all the underlying calls until it hands you a flat array ready to use.
