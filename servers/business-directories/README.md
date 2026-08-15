# @mcp-toolkit/server-business-directories

MCP server for business and people discovery across business directory sources.

## Purpose

This server provides a stateless discovery capability for:
- businesses and organizations
- founders, executives, and decision-makers
- regional and country-scoped source selection

The runtime and agent layer may select a region, country, or entity type and ask this server for the most relevant source candidates. The server does not own durable execution state or tenant-scoped persistence.

## Supported discovery model

The server exposes a source catalog keyed by:
- region: north-america, south-america, europe, africa, asia, oceania
- country: ISO codes like us, gb, de, in, sg, au, za, br
- entity type: business or person

This allows a SaaS app or an agent to filter candidate sources by geography and target entity before attempting live lookups or enrichment.

## Tools

| Tool | Purpose |
|------|---------|
| `company_directory_search` | Discover company sources and directory candidates by query, region, country, or location. |
| `person_directory_search` | Discover professional and people sources for founders, executives, and decision-makers. |
| `business_listing_lookup` | Resolve a company listing candidate by company name and optional country/region filters. |

## Example usage

```json
{
  "query": "B2B SaaS agencies",
  "region": "north-america",
  "country": "us",
  "entity_type": "business",
  "limit": 8
}
```

```json
{
  "query": "CEO",
  "company_name": "Acme Cloud",
  "country": "us",
  "role": "founder",
  "limit": 5
}
```

## Architecture contract

- This server must remain stateless.
- It exposes capability metadata and reproducible source-catalog results.
- The app layer resolves tenant credentials and secrets separately.
- A runtime can discover the capability from the registry and then call the server with region/country/entity filters.

## Seed-file workflow

This server uses a seed JSON file as the canonical editable source list:

- `src/seeds/directory-sources.json` holds the source catalog
- `src/catalog.ts` reads that file and exposes the runtime-facing catalog API

This is the recommended extension pattern for practical usage.

### When to edit the catalog vs add a seed

Prefer adding a seed when:
- you are adding or updating a source in the maintained discovery list
- you want the catalog to be data-driven and auditable
- you want to keep the TypeScript contract stable while changing source content

Prefer editing the TypeScript catalog only when:
- you are changing the schema of a source record
- you are adding new source metadata fields or enums
- you are changing the runtime filtering logic or contract shape

In other words: source rows belong in the seed file; runtime behavior belongs in the catalog module.

## Source catalog guidance

Each source entry should include:
- `id`
- `name`
- `kind`
- `entity_types`
- `region`
- `country`
- `url`
- `search_modes`
- `notes`
- `recommended_for`

This is intentionally schema-light and easy to extend without creating app-specific execution state.

## Practical usage

1. Add or update a new source in `src/seeds/directory-sources.json`.
2. Keep `region`, `country`, and `entity_types` aligned with the canonical taxonomy.
3. Use `company_directory_search` or `person_directory_search` with the target geography and entity filters.
4. Let the runtime pick the most relevant source list; the SaaS app remains responsible for durable execution state and credential resolution.
5. If the source needs a new field, update the TypeScript `DirectorySource` interface first, then align the JSON seed with it.
