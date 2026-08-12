# Tool Contracts

All tools must:

- Have a unique `name` (snake_case).
- Expose a JSON Schema `inputSchema` conforming to JSON Schema draft-07.
- Return data using canonical schemas from `/schemas/` where applicable.
- Throw `ValidationError` for bad inputs (from `@mcp-toolkit/errors`).
- Never expose raw API credentials in output.
- Be stateless — no shared mutable state between calls.

## Canonical Schemas

| Schema | Used by |
|--------|---------|
| `company` | `enrich_company`, `maps_search_places`, … |
| `person` | `enrich_person` |
| `contact` | CRM tools |
| `lead` | Aggregated lead output |
| `technology` | `detect_technologies` |
| `buying-signal` | `company-intelligence` tools |
| `source-evidence` | All tools (provenance) |
