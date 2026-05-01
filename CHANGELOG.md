# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-05-01

### Added (Efecto WOW 🚀)
- **Recurrente CLI**: Añadido soporte nativo para `npx @rodmarzavala/recurrente-sdk listen` y `npx @rodmarzavala/recurrente-sdk init`.
- **Webhook Forwarder (listen)**: Permite escuchar eventos de Recurrente en tu entorno local sin depender de ngrok o locatunnel. Re-firma automáticamente los payloads de Smee.io usando tu secreto local, permitiendo simular el comportamiento de producción (similar a Stripe CLI).
- **Setup Wizard (init)**: Asistente interactivo que te permite inicializar tus llaves de API en un `.env` y genera el código *boilerplate* de tu webhook handler en Next.js (App Router) o Express.
- Arquitectura *Zero-Dependency*: La CLI aprovecha `node:util` y las Web APIs (`fetch`, `crypto`) nativas de Node 18+ sin inflar el tamaño de la librería.

## [1.1.1] - 2026-05-01

### Fixed
- **Documentation**: Updated `README.md` and VitePress documentation (`docs/`) to accurately reflect the new DX features introduced in `v1.1.0` (`isRecurrenteError`, `RequestOptions`, and `constructEvent`).

## [1.1.0] - 2026-05-01

### Added
- **Developer Experience (DX) Overhaul**: Comprehensive enhancements for production-grade integrations.
- **Type Guards**: Introduced `isRecurrenteError(error)` to safely narrow thrown exceptions and extract HTTP status codes and parsed API bodies.
- **Advanced Webhook Typing**: Added `RecurrenteEvent` discriminated union type. Allows type-safe event handling (`checkout.succeeded`, `subscription.canceled`, etc.) directly from `constructEvent()`.
- **Per-Request Options**: Every API endpoint method now accepts an optional `RequestOptions` parameter to override the default `timeout` or explicitly provide a custom `idempotencyKey`.
- **JSDoc Documentation**: Comprehensive JSDoc comments added to all public methods across the SDK, providing rich inline IDE documentation and parameter descriptions.
- **Examples Library**: New `/examples` directory demonstrating integration patterns for Node.js (Express), Next.js (App Router / Edge), and Cloudflare Workers.

## [1.0.0] - 2026-05-01

### Added
- **100% API Coverage**: The SDK now supports all official Recurrente API endpoints.
- **`account` module** — `retrieve` account details
- **`coupons` module** — `list`, `retrieve`, `create`, `update`, `archive`
- **`paymentIntents` module** — `update` (attach tax invoices)
- **`terminalSessionCommands` module** — `create` POS terminal sessions
- **`transfers` module** — `create` internal transfers
- **`users` module** — `create` users
- **`test` module** — `credentials` validation
- **Documentation**: Updated API reference with all new modules.

## [0.3.2] - 2026-05-01

### Fixed
- Resolve `404 Not Found` npm publish error by explicitly upgrading npm and removing `registry-url` to prevent token conflicts with OIDC Trusted Publishing.

## [0.3.1] - 2026-05-01

### Changed
- Switch to npm Trusted Publishing (OIDC) via GitHub Actions, replacing static tokens
- Fix test timeout for exponential backoff test under Node.js 18
- Expand npm keywords and package description for better discovery in Guatemala

## [0.3.0] - 2026-05-01

### Added
- Polyfill Web Crypto API natively for Node.js 18 in Vitest environment
- Unify CI/CD workflows into a single layered pipeline (Security Gates)
- Isolate OpenSSF Scorecard to dedicated workflow for strict OIDC compliance

## [0.2.0] - 2026-04-30

### Added
- **`refunds` module** — `create`, `retrieve`, `list` (with `checkout_id` filter)
- **`products` module** — `list`, `retrieve`, `create`, `update`, `archive`
- **`customers` module** — `list`, `retrieve`, `create`, `update`
- **`webhookEndpoints` module** — `list`, `retrieve`, `create`, `delete`
- **Pagination support** — `list()` on all collection endpoints returns `Page<T>` with `meta` (currentPage, totalPages, totalCount, hasNextPage, hasPrevPage) parsed from RFC 8288 response headers
- **`pageIterator()`** — async generator to iterate all pages lazily
- **`autoPagingToArray()`** — fetches all pages and returns a flat array, with optional `limit`
- **`timeout` option** — configurable per-client and per-request via `AbortController`; defaults to 30 s
- **Automatic idempotency keys** — UUID generated on every mutating request (POST/PATCH/PUT/DELETE) and reused across retry attempts to prevent duplicate charges
- **Webhook replay-attack prevention** — `verifySignature` now rejects events older than 5 minutes by default; configurable via `options.maxAgeSeconds`

### Changed
- `RecurrenteClientOptions` now accepts `timeout?: number`
- `subscriptions.create` response now typed as `CreateSubscriptionResponse` with both `subscription` and `checkout_url`
- `subscriptions` module now exposes `retrieve()` and `list()`
- `checkouts` module now exposes `list()`

## [0.1.0] - 2026-04-30

### Added
- `RecurrenteClient` — base HTTP client with typed error handling and exponential
  backoff retries (429 / 5xx, max 3 attempts, full-jitter, honours `Retry-After`)
- `CheckoutsModule` — `create` and `retrieve` methods
- `SubscriptionsModule` — `create` and `cancel` methods
- `RecurrenteWebhooks.verifySignature` — constant-time Svix HMAC-SHA256
  verification using Web Crypto API (zero Node.js dependencies, Edge-safe)
- Full TypeScript types for all request/response shapes
- Vitest test suite — 13 tests covering retries and cryptographic verification

[Unreleased]: https://github.com/rodmarzavala/recurrente-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/rodmarzavala/recurrente-sdk/releases/tag/v0.1.0
