# Adding a Provider

1. **Create the package** — `providers/<name>/` with `package.json`, `tsconfig.json`, and `src/index.ts`.

2. **Implement the adapter** — export typed functions that call the external API using `@mcp-toolkit/http`. Use `@mcp-toolkit/auth` for API key handling.

3. **Declare dependencies** in `providers/<name>/package.json` — only depend on `@mcp-toolkit/auth`, `@mcp-toolkit/http`, `@mcp-toolkit/utils`, and `@mcp-toolkit/errors`.

4. **Register it** — add an entry to `registry/providers.json`.

5. **Add the env var** to `.env.example`.

6. **Use it in a server** — add the provider as a dependency of the relevant server package and import from it.
