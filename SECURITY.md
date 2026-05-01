# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅ Current |
| 0.1.x   | ⚠️ Security fixes only |
| < 0.1   | ❌ Not supported |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing: **info@rodmarzavala.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Impact assessment if possible

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days** for confirmed vulnerabilities.

## Security Design

This SDK is designed with security as a core principle:

- **Zero runtime dependencies** — no third-party code in production
- **Web Crypto API** — all cryptographic operations use `globalThis.crypto.subtle`, a battle-tested browser standard
- **Constant-time comparison** — webhook verification uses `crypto.subtle.verify` to prevent timing attacks
- **Replay-attack prevention** — webhook signatures older than 5 minutes are rejected by default
- **Idempotency keys** — mutating requests include a UUID `Idempotency-Key` to prevent duplicate charges
- **Principle of least privilege** — the SDK uses only the API keys you provide; the `publicKey` is kept separate to allow frontend-safe operations
