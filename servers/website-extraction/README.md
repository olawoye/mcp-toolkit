# Website Extraction Server

This server is for fetching a web page and preserving enough structure for downstream lead extraction, especially on list/catalog/directory pages that contain multiple candidate companies.

## Purpose

Use this tool when a result from web search is classified as `needs-extraction` and the target URL is a listing, directory, catalog, article, or other page that likely contains multiple lead candidates rather than a single profile page.

The server intentionally does two things:

1. Returns the legacy plain-text payload (`pageText`) for backward compatibility.
2. Also returns structured page metadata that is essential for multi-company extraction.

## Recommended usage

### Use this tool when

- the URL is a list page or directory page
- the page contains multiple company cards or outbound links
- the SaaS app needs candidate-level extraction rather than single-company profile extraction
- the page may be a catalog, market directory, provider list, article list, or service index

### Do not use this tool as a single-company profile extractor on list pages

A list page should not be treated the same as a single company profile page. The follow-up prompt should say:

- “Extract multiple candidate companies from this page” for list/catalog pages
- “Extract company profile details” for profile/about/contact pages

## Output contract

The tool returns a structured object with the following fields:

```json
{
  "success": true,
  "url": "https://example.com/agencies",
  "canonical_url": "https://example.com/agencies",
  "title": "Top Design Agencies",
  "page_kind": "list",
  "pageText": "... flattened legacy text ...",
  "outbound_links": [
    "https://example.com/company/acme",
    "https://example.com/company/zenith"
  ],
  "candidate_cards": [
    { "title": "Acme Studio", "url": "https://example.com/company/acme" },
    { "title": "Zenith Co", "url": "https://example.com/company/zenith" }
  ],
  "extractionQuery": "Extract multiple candidate companies from this page",
  "outputSchema": { "type": "object" },
  "extracted_fields": [],
  "extracted_data": {},
  "source": "website-extraction"
}
```

## Best practices for agents and developers

### 1. Treat list pages as multi-company opportunities

If `page_kind` is `list`, the downstream step should not be a single-company profile task. Use a multi-company extraction prompt and schema instead.

Example prompt:

```text
Extract multiple candidate companies from this page. Return the most likely business entities, each with company name, website, location, and a confidence reason when available.
```

### 2. Preserve outbound links and candidate cards

These fields are the most valuable for list and directory pages:

- `outbound_links`: critical URLs that may represent candidate profiles or detail pages
- `candidate_cards`: structured hints from anchor text and card-like link patterns

These are more valuable than raw flattened text for lead discovery.

### 3. Keep the text fallback for compatibility

`pageText` is still useful for:

- debugging
- fallbacks
- broad semantic extraction
- legacy workflows

But it should not be the only source of truth for list pages.

### 4. Use page kind to choose the downstream schema

Use this split:

- `page_kind === "list"` -> multi-company extraction schema
- `page_kind === "profile"` -> single-company profile schema
- `page_kind === "article"` -> article/person/company mention extraction schema
- otherwise -> fallback generic extraction

### 5. Prefer error-safe extraction

If the page fails to fetch or parse, the tool still returns a structured result with a warning-like text message rather than throwing a hard failure. The SaaS app should treat this as a degraded extraction path, not as a hard stop.

### 6. Keep the extraction query explicit

The tool is most effective when the `extractionQuery` clearly states the intent:

- “Extract multiple candidate companies from this page”
- “Extract company profile details from this page”
- “Find service providers and websites in this directory list”

This matters because it reduces ambiguity between list pages and profile pages.

## Example usage

```json
{
  "url": "https://example.com/agencies",
  "extractionQuery": "Extract multiple candidate companies from this list page.",
  "outputSchema": {
    "type": "object",
    "properties": {
      "candidates": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "company_name": { "type": "string" },
            "website": { "type": "string" },
            "location": { "type": "string" }
          }
        }
      }
    }
  }
}
```

## Guidance for the SaaS app

After calling this tool, the app should:

1. Read `page_kind` first.
2. If `page_kind === "list"`, route to multi-company extraction.
3. Use `candidate_cards` and `outbound_links` as the strongest structured hints.
4. Treat `pageText` as a secondary fallback rather than the main extraction source.
5. Only use the single-company profile flow for true profile pages.

## Summary

This server is designed for preserving enough structure for outbound lead extraction on list and directory pages. It is not just a plain HTML-to-text scraper; it is a structured list-page extraction aid for downstream candidate generation.
