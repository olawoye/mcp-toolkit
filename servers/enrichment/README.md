# @mcp-toolkit/server-enrichment

MCP server for company and person enrichment using Apollo's current search endpoints.

## Tools

| Tool | Description |
|------|-------------|
| `enrich_company` | Company search via Apollo `mixed_companies/search` |
| `enrich_person` | Person search via Apollo `mixed_people/api_search` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MT_PROVIDER_APOLLO_URL` | Yes | Apollo base URL, typically `https://api.apollo.io` |
| `MT_PROVIDER_APOLLO_KEY` | Yes | Apollo API key passed as `x-api-key` |
| `APOLLO_API_KEY` | Optional fallback | Legacy fallback key name |
| `APOLLO_BASE_URL` | Optional fallback | Legacy fallback base URL |

## Apollo contract

The server posts to Apollo at `https://api.apollo.io/api/v1` and uses the current endpoints:

- `POST /api/v1/mixed_companies/search`
- `POST /api/v1/mixed_people/api_search`

Authentication remains `x-api-key` in the request headers.
