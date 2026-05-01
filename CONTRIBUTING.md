# Contributing to recurrente-sdk

First off — **thank you** for taking the time to contribute! 🎉  
Every bug report, suggestion, and pull request makes this project better for everyone.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Releasing (Maintainers)](#releasing-maintainers)

---

## Code of Conduct

This project follows a simple rule: **be kind, be constructive**.  
Harassment, personal attacks, or discriminatory language of any kind will not be tolerated.

---

## Ways to Contribute

| Type | How |
|------|-----|
| 🐛 Bug report | [Open an issue](../../issues/new?template=bug_report.yml) |
| 🚀 Feature idea | [Open an issue](../../issues/new?template=feature_request.yml) |
| 📝 Documentation | Edit `.md` files and open a PR |
| 💻 Code | Fork → branch → PR (see below) |
| 💬 Questions | Open a plain issue or start a Discussion |

---

## Development Setup

### Prerequisites

- **Node.js ≥ 18** (for native `fetch` and Web Crypto API in tests)
- **npm ≥ 9**

### Steps

```bash
# 1. Fork & clone
git clone https://github.com/rodmarzavala/recurrente-sdk.git
cd recurrente-sdk

# 2. Install dev dependencies (zero runtime deps!)
npm install

# 3. Run the test suite
npm test

# 4. Type-check the entire project
npm run typecheck

# 5. Watch mode during development
npm run test:watch
```

All tests should pass before you open a PR. If you break an existing test intentionally (e.g. a breaking change), explain why in the PR description.

---

## Project Structure

```
recurrente-sdk/
├── src/
│   ├── client.ts          # Base HTTP client + retry logic
│   ├── index.ts           # Public entry point / Recurrente facade
│   ├── types/
│   │   └── index.ts       # All TypeScript interfaces
│   └── modules/
│       ├── checkouts.ts
│       ├── subscriptions.ts
│       └── webhooks.ts    # Static verifySignature (Web Crypto only)
├── tests/
│   ├── client.test.ts
│   └── webhooks.test.ts
└── docs/
    ├── getting-started.md
    ├── api-reference.md
    └── webhooks.md
```

---

## Coding Standards

These rules are enforced by `tsc --strict`. The CI will reject any PR that breaks them.

| Rule | Details |
|------|---------|
| **No `any`** | Use explicit interfaces. If you need an escape hatch, use `unknown` + type guard. |
| **Edge-safe** | No Node.js built-in imports (`crypto`, `http`, `fs`, …). Everything must work in Cloudflare Workers / Deno / Bun. |
| **Zero runtime deps** | Do not add entries to `dependencies` in `package.json`. Dev dependencies are fine. |
| **Fetch only** | No Axios, `node-fetch`, `got`, etc. |
| **Explicit return types** | All exported functions must have explicit return types. |

### Code style

We keep it simple — no Prettier or ESLint config yet. Follow the style of the existing code:
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures

---

## Testing

Every new feature or bug fix **must** include tests.

```bash
npm test          # Run once
npm run test:watch  # Watch mode
```

### What to test

- **New module methods** → mock `fetch` (see `tests/client.test.ts` for the pattern)
- **Crypto / security logic** → generate real signatures using `crypto.subtle.sign` (see `tests/webhooks.test.ts`)
- **Error paths** → test non-2xx status codes and malformed inputs

### What NOT to mock

Never mock `globalThis.crypto.subtle`. The webhook tests must use the real Web Crypto API to be meaningful.

---

## Submitting a Pull Request

1. **Create a branch** from `main` with a descriptive name:
   ```bash
   git checkout -b feat/refunds-module
   git checkout -b fix/retry-on-503
   git checkout -b docs/add-examples
   ```

2. **Make your changes** and commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add RefundsModule with create and retrieve methods
   fix: retry on HTTP 503 in addition to 502
   docs: add usage example for webhook verification
   chore: upgrade vitest to 2.x
   ```

3. **Update `CHANGELOG.md`** under the `[Unreleased]` section.

4. **Open the PR** against `main`. Fill in the PR template completely.

5. A maintainer will review and merge. We aim to respond within **72 hours**.

---

## Releasing (Maintainers)

```bash
# 1. Bump version in package.json
npm version minor   # or patch / major

# 2. Update CHANGELOG.md — move [Unreleased] items to the new version heading

# 3. Build
npm run build

# 4. Publish
npm publish

# 5. Tag & push
git push && git push --tags
```
