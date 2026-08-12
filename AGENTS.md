# AGENTS.md

Guidelines for AI coding agents (Copilot, Claude, Codex, etc.) working in this repository.

---

## Repository Overview

`mcp-toolkit` is a **pnpm monorepo** of independently deployable MCP servers, provider adapters, and shared infrastructure packages. The toolkit is deliberately decoupled from any particular agent or orchestration runtime.

Key directories:

| Path | Purpose |
|------|---------|
| `servers/` | One MCP server per capability domain |
| `providers/` | Thin type-only adapters to external APIs |
| `shared/` | Reusable infrastructure (auth, http, caching, logging, errors, …) |
| `schemas/` | Canonical JSON Schema data contracts shared across tools |
| `registry/` | Machine-readable tool/server/provider manifests |
| `config/` | Environment-specific configuration defaults |
| `docs/` | Architecture and contributor guides |
| `tests/` | Integration and contract test suites |

---

## Setup

```bash
# Requires: Node ≥ 20, pnpm ≥ 9
pnpm install
pnpm build
pnpm test
```

Copy `.env.example` to `.env` and fill in API keys before running any server.

---

## Core Conventions

### Servers (`servers/<name>/`)

- Each server exposes a `createServer(): McpServer` factory in `src/server.ts`.
- Tools are registered in the `tools` array returned by `createServer()`.
- **No pre-emptive implementations** — a server stub has an empty `tools` array with a `// TODO: register tools here` comment until the tool is formally defined.
- Entry points (`src/index.ts`) only instantiate and start the server; they must not contain business logic.
- Every server declares its `@mcp-toolkit/*` shared dependencies in its own `package.json`.

### Providers (`providers/<name>/`)

- Providers are **type-only stubs** until wired up. They export TypeScript interfaces and a single async function that `throw new Error('Not implemented — wire <ENV_VAR>')`.
- No HTTP calls, no business logic — just type contracts.
- Providers must never import from `servers/`.

### Shared packages (`shared/<name>/`)

- Each package has a single `src/index.ts` entry point.
- Packages may only depend on other `@mcp-toolkit/*` shared packages; they must not import from `servers/` or `providers/`.
- All public functions must be covered by unit tests in `src/index.test.ts`.

### Schemas (`schemas/`)

- JSON Schema (draft-07) files only — no TypeScript types here.
- If you add a schema, register it in `registry/tools.json` or `registry/servers.json` as appropriate.

---

## Adding a New Tool

1. Identify the server that owns the tool (or create a new server).
2. Read [`docs/adding-a-tool.md`](docs/adding-a-tool.md) for the full walkthrough.
3. Define the input/output contract in `schemas/` if it introduces new data shapes.
4. Register the tool in `registry/tools.json`.
5. Add unit tests co-located with the implementation.

## Adding a New Provider

1. Create `providers/<name>/src/index.ts` with type exports and `throw new Error('Not implemented')` stubs.
2. Add `providers/<name>/package.json` and `tsconfig.json` following the pattern of existing providers.
3. Register the provider in `registry/providers.json`.
4. Read [`docs/adding-a-provider.md`](docs/adding-a-provider.md) for more detail.

---

## Testing

Each package runs its own tests via `vitest`:

```bash
pnpm test                          # all packages
pnpm --filter @mcp-toolkit/errors test   # single package
```

- Use `--passWithNoTests` (already configured) so packages with only stubs don't fail CI.
- Unit tests live in `src/index.test.ts` (co-located, not in a separate `tests/` directory).
- Integration tests that span multiple packages go in `tests/integration/`.
- Schema contract tests go in `tests/contract/`.

---

## Linting & Type Checking

```bash
pnpm lint        # eslint across all packages
pnpm typecheck   # tsc --noEmit across all packages
pnpm build       # compile to dist/ (must be clean before merging)
```

---

## Environment Variables

All API keys are read from environment variables. Never hard-code credentials.
See `.env.example` for the full list. The `shared/auth` package provides `requireApiKey()` and `optionalApiKey()` helpers.

---

## Design Constraints

- **No agent coupling**: nothing in this repo should reference a specific agent, workflow, or runtime.
- **Independent deployability**: every server in `servers/` must be buildable and testable without any other server being present.
- **Schema-first**: cross-tool data shapes must be defined in `schemas/` before implementing.
- **Provider independence**: tools declare which provider interface they depend on; the concrete provider can be swapped without changing the tool contract.
