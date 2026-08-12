# Architecture

## Overview

`mcp-toolkit` is a pnpm monorepo of independently deployable MCP servers, each exposing a focused set of tools, backed by provider adapters and shared infrastructure.

```
┌──────────────────────────────────────────────────────┐
│                    AI Agents / Apps                  │
│          (Claude, Codex, TypeScript runtime)         │
└────────────────────────┬─────────────────────────────┘
                         │  MCP Protocol
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌──────────┐   ┌────────────┐   ┌────────────┐
   │web-search│   │   maps     │   │ enrichment │  … (more servers)
   └──────────┘   └────────────┘   └────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
              ┌──────────▼──────────┐
              │  shared/            │
              │  auth, http,        │
              │  caching, logging,  │
              │  rate-limiting …    │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌──────────┐   ┌────────────┐   ┌────────────┐
   │ google   │   │   hunter   │   │   apollo   │  … (more providers)
   └──────────┘   └────────────┘   └────────────┘
```

## Packages

| Path | Purpose |
|------|---------|
| `servers/*` | MCP servers — one per capability domain |
| `providers/*` | External API adapters |
| `shared/*` | Reusable infrastructure |
| `schemas/` | Canonical JSON schemas for cross-tool data contracts |
| `registry/` | Machine-readable capability registry |
| `config/` | Environment-specific defaults |

## Key Principles

1. **Tool independence** — each tool can be consumed, tested, and deployed in isolation.
2. **Provider independence** — tools declare provider dependencies; swapping providers doesn't change tool contracts.
3. **Schema-first contracts** — all cross-tool data uses canonical schemas.
4. **Zero agent coupling** — no agent-specific logic lives here; agents decide which tools to use.
