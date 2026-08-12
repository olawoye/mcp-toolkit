# Adding a Tool

1. **Choose the right server** — does your tool belong to an existing domain (e.g. `web-search`, `maps`)? If not, create a new server.

2. **Create the tool file** — add `servers/<server>/src/tools/<your-tool>.ts`:
   ```typescript
   import type { McpTool } from '../server.js';

   export const myTool: McpTool = {
     name: 'my_tool',
     description: 'What this tool does.',
     inputSchema: {
       type: 'object',
       properties: {
         param: { type: 'string', description: '...' },
       },
       required: ['param'],
     },
     async execute(input: unknown) {
       // implementation
     },
   };
   ```

3. **Register it** in `servers/<server>/src/server.ts` — add to the `tools` array.

4. **Add it to the registry** — append an entry to `registry/tools.json`.

5. **Write a test** — add `servers/<server>/tests/<your-tool>.test.ts`.

6. **Update the server README** — add a row to the Tools table.
