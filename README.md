# mcp-toolkit

> **Modular MCP Toolkit for Agentic Software**

A pnpm monorepo of independently deployable [MCP](https://modelcontextprotocol.io/) servers, provider adapters, and shared infrastructure. Tools expose capabilities; agent definitions decide which tools to use; runtimes decide how to orchestrate them.

---

## Status

🚧 **Scaffold phase** — structure, contracts, and shared infrastructure are in place. Server tools will be implemented once the target business scenario is defined.

---

## Repository Layout

```
mcp-toolkit/
├── servers/                  # MCP capability servers (one per domain)
│   ├── web-search/           # Web & news search
│   ├── maps/                 # Maps, place search, nearby discovery
│   ├── enrichment/           # Company, person, email, phone enrichment
│   ├── technology-detection/ # Website tech-stack detection
│   ├── business-directories/ # Business directory lookups  [planned]
│   ├── public-data/          # Government / public data    [planned]
│   ├── website-research/     # Website content research    [planned]
│   ├── company-intelligence/ # Buying signals, news        [planned]
│   ├── events/               # Industry events             [planned]
│   └── crm/                  # CRM integrations            [planned]
│
├── providers/                # Thin adapters to external APIs (type stubs)
│   ├── google/               # Google Search + Maps
│   ├── bing/                 # Bing Web Search
│   ├── openstreetmap/        # Nominatim geocoding
│   ├── hunter/               # Hunter.io email discovery
│   ├── apollo/               # Apollo.io people/company search
│   ├── builtwith/            # BuiltWith tech detection
│   └── opencorporates/       # OpenCorporates company data
│
├── shared/                   # Reusable infrastructure packages
│   ├── auth/                 # API key / credential management
│   ├── http/                 # HTTP client with retry + timeout
│   ├── rate-limiting/        # Token-bucket rate limiter
│   ├── caching/              # TTL-based in-memory cache
│   ├── logging/              # Structured JSON logger
│   ├── errors/               # Typed error hierarchy
│   ├── validation/           # Input validation helpers
│   ├── pagination/           # Pagination utilities
│   ├── observability/        # Span tracing stubs
│   └── utils/                # General utilities
│
├── schemas/                  # Canonical JSON Schema data contracts
│   ├── company.schema.json
│   ├── person.schema.json
│   ├── address.schema.json
│   ├── contact.schema.json
│   ├── lead.schema.json
│   ├── technology.schema.json
│   ├── buying-signal.schema.json
│   └── source-evidence.schema.json
│
├── registry/                 # Machine-readable capability registry
│   ├── tools.json
│   ├── servers.json
│   └── providers.json
│
├── config/                   # Environment-specific defaults
│   ├── development.json
│   ├── production.json
│   └── tool-defaults.json
│
├── tests/
│   ├── integration/          # Cross-server integration tests
│   └── contract/             # Schema contract tests
│
└── docs/
    ├── architecture.md
    ├── adding-a-tool.md
    ├── adding-a-provider.md
    ├── tool-contracts.md
    └── deployment.md
```

---

## Quick Start

```bash
# Requires pnpm ≥ 9, Node ≥ 20
cp .env.example .env       # fill in API keys as needed
pnpm install
pnpm build
pnpm test
```

---

## Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Tool independence** | Every tool can be developed, tested, and deployed in isolation |
| **Provider independence** | Tools declare which provider they need; swapping providers doesn't change the tool contract |
| **Schema-first** | All cross-tool data shapes are defined in `/schemas/` |
| **Zero agent coupling** | No agent-specific logic lives here — agents decide which tools to call |
| **Shared infrastructure** | Auth, HTTP, caching, logging, rate limiting are reused across all tools |

---

## Documentation

- [Architecture](docs/architecture.md)
- [Adding a Tool](docs/adding-a-tool.md)
- [Adding a Provider](docs/adding-a-provider.md)
- [Tool Contracts](docs/tool-contracts.md)
- [Deployment](docs/deployment.md)
