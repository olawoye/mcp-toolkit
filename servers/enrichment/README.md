# @mcp-toolkit/server-enrichment

MCP server for data enrichment: company registration lookup, person profiles, email discovery, and phone normalization.

## Tools

| Tool | Description |
|------|-------------|
| `enrich_company` | Public company registration lookup via OpenCorporates |
| `enrich_person` | Person profile search via Apollo.io |
| `enrich_email` | Email discovery/verification via Hunter.io |
| `enrich_phone` | Phone normalization and carrier lookup |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APOLLO_API_KEY` | For `enrich_person` | Apollo.io API key |
| `HUNTER_API_KEY` | For `enrich_email` | Hunter.io API key |
| `OPENCORPORATES_API_KEY` | Optional | Higher rate limits |
