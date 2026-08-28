import { createLogger } from '@mcp-toolkit/logging';
import http from 'node:http';

const logger = createLogger('yellow-pages-server');

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  execute(input: unknown): Promise<unknown>;
}

export interface McpServer {
  name: string;
  version: string;
  tools: McpTool[];
  start(): void;
}

export const requiredEnvironment: string[] = [
  'MT_PROVIDER_HUNTER_KEY',
  'MT_PROVIDER_LUSHA_KEY',
  'MT_PROVIDER_UPLEAD_KEY',
  'MT_PROVIDER_OUTSCRAPER_KEY',
  'MT_PROVIDER_APIFY_KEY',
];

export interface YellowPagesServerConfig {
  providerPriority?: string[];
  loopMode?: 'first_enriched' | 'first';
}

interface ProviderCandidate {
  name: string;
  envName: string;
  baseUrl?: string;
  lookup: (config: Record<string, string>, input: Record<string, string | number | undefined>) => Promise<Record<string, unknown>>;
}

const LOOP_MODE_DEFAULT = 'first_enriched' as const;

function normalizeLoopMode(value?: string): 'first_enriched' | 'first' {
  const normalized = (value ?? process.env.MT_YELLOW_PAGES_LOOP_MODE ?? LOOP_MODE_DEFAULT).trim().toLowerCase();
  return normalized === 'first' ? 'first' : 'first_enriched';
}

function isConfiguredEnvironmentValue(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.length > 0 && !['na', 'none', 'null', 'undefined'].includes(normalized);
}

function getExistingLeadRecords(input: Record<string, unknown>): unknown {
  const candidates = [
    input.lead_records,
    input.leads,
    input.records,
    input.existing_leads,
    input.existingRecords,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return input;
}

function hasEnrichedContact(contact: Record<string, unknown> | undefined): boolean {
  if (!contact) return false;
  const email = typeof contact.email === 'string' ? contact.email.trim() : '';
  return email.length > 0;
}

const providerCandidates: ProviderCandidate[] = [
  {
    name: 'hunter',
    envName: 'MT_PROVIDER_HUNTER_KEY',
    lookup: async (config, input) => {
      const domain = String(input.domain ?? '').trim();
      if (!domain) throw new Error('Hunter lookup requires a domain.');
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(config.MT_PROVIDER_HUNTER_KEY)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Hunter lookup failed (${response.status}): ${text}`);
      }
      return (await response.json()) as Record<string, unknown>;
    },
  },
  {
    name: 'lusha',
    envName: 'MT_PROVIDER_LUSHA_KEY',
    lookup: async (config, input) => {
      const domain = String(input.domain ?? '').trim();
      if (!domain) throw new Error('Lusha lookup requires a domain.');
      const response = await fetch('https://api.lusha.com/v1/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${config.MT_PROVIDER_LUSHA_KEY}`,
        },
        body: JSON.stringify({ domain }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Lusha lookup failed (${response.status}): ${text}`);
      }
      return (await response.json()) as Record<string, unknown>;
    },
  },
  {
    name: 'uplead',
    envName: 'MT_PROVIDER_UPLEAD_KEY',
    lookup: async (config, input) => {
      const domain = String(input.domain ?? '').trim();
      const companyName = String(input.company_name ?? '').trim();
      const response = await fetch('https://api.uplead.com/v1/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${config.MT_PROVIDER_UPLEAD_KEY}`,
        },
        body: JSON.stringify({ domain: domain || undefined, company_name: companyName || undefined }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`UpLead lookup failed (${response.status}): ${text}`);
      }
      return (await response.json()) as Record<string, unknown>;
    },
  },
  {
    name: 'outscraper',
    envName: 'MT_PROVIDER_OUTSCRAPER_KEY',
    lookup: async (config, input) => {
      const query = String(input.query ?? input.company_name ?? input.domain ?? '').trim();
      if (!query) throw new Error('Outscraper lookup requires a query or company name.');
      const response = await fetch(`https://api.app.outscraper.com/google-maps/search?query=${encodeURIComponent(query)}&api_key=${encodeURIComponent(config.MT_PROVIDER_OUTSCRAPER_KEY)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Outscraper lookup failed (${response.status}): ${text}`);
      }
      return (await response.json()) as Record<string, unknown>;
    },
  },
  {
    name: 'apify',
    envName: 'MT_PROVIDER_APIFY_KEY',
    lookup: async (config, input) => {
      const query = String(input.query ?? input.company_name ?? input.domain ?? '').trim();
      if (!query) throw new Error('Apify lookup requires a query or company name.');
      const response = await fetch('https://api.apify.com/v2/acts?token=' + encodeURIComponent(config.MT_PROVIDER_APIFY_KEY), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Apify lookup failed (${response.status}): ${text}`);
      }
      return (await response.json()) as Record<string, unknown>;
    },
  },
];

function getAvailableProviders(): ProviderCandidate[] {
  return providerCandidates.filter((provider) => isConfiguredEnvironmentValue(process.env[provider.envName]));
}

function extractContactsFromProvider(result: Record<string, unknown>, providerName: string): Record<string, unknown>[] {
  const contacts: Record<string, unknown>[] = [];

  if (providerName === 'hunter') {
    const data = Array.isArray((result as Record<string, unknown>).data) ? (result as Record<string, unknown>).data as Record<string, unknown>[] : [];
    for (const entry of data) {
      const email = typeof entry.email === 'string' ? entry.email : null;
      const firstName = typeof entry.first_name === 'string' ? entry.first_name : null;
      const lastName = typeof entry.last_name === 'string' ? entry.last_name : null;
      if (email) {
        contacts.push({
          first_name: firstName,
          last_name: lastName,
          email,
          source: 'hunter',
        });
      }
    }
  }

  if (providerName === 'outscraper') {
    const data = Array.isArray(result?.results) ? result.results as Record<string, unknown>[] : Array.isArray(result?.data) ? result.data as Record<string, unknown>[] : [];
    for (const entry of data) {
      const email = typeof entry.email === 'string' ? entry.email : typeof entry.contact_email === 'string' ? entry.contact_email : null;
      const company = typeof entry.company_name === 'string' ? entry.company_name : typeof entry.name === 'string' ? entry.name : null;
      if (email || company) {
        contacts.push({ company_name: company, email, phone: entry.phone ?? null, source: 'outscraper' });
      }
    }
  }

  if (providerName === 'uplead' || providerName === 'lusha') {
    const list = Array.isArray(result?.data) ? result.data as Record<string, unknown>[] : Array.isArray(result?.results) ? result.results as Record<string, unknown>[] : [];
    for (const entry of list) {
      const email = typeof entry.email === 'string' ? entry.email : typeof entry.person_email === 'string' ? entry.person_email : null;
      const companyName = typeof entry.company_name === 'string' ? entry.company_name : typeof entry.organization_name === 'string' ? entry.organization_name : null;
      if (email || companyName) {
        contacts.push({
          company_name: companyName,
          email,
          phone: entry.phone ?? entry.direct_phone ?? null,
          title: entry.title ?? null,
          source: providerName,
        });
      }
    }
  }

  return contacts;
}

async function lookupFallbackContact(input: Record<string, string | number | undefined>, existingRecords?: unknown) {
  const loopMode = normalizeLoopMode(process.env.MT_YELLOW_PAGES_LOOP_MODE);
  const available = getAvailableProviders();
  const leadRecords = existingRecords ?? getExistingLeadRecords(input as Record<string, unknown>);

  if (available.length === 0) {
    return {
      success: false,
      reason: 'no_provider_configured',
      message: 'No fallback contact provider was configured. Set one of MT_PROVIDER_HUNTER_KEY, MT_PROVIDER_LUSHA_KEY, MT_PROVIDER_UPLEAD_KEY, MT_PROVIDER_OUTSCRAPER_KEY, or MT_PROVIDER_APIFY_KEY with a non-empty value other than "na" or "none".',
      provider: null,
      contacts: [],
      source: 'yellow-pages',
      loopMode,
      lead_records: Array.isArray(leadRecords) ? leadRecords : [],
      existing_leads: Array.isArray(leadRecords) ? leadRecords : [],
    };
  }

  for (const provider of available) {
    try {
      const config: Record<string, string> = {};
      for (const candidate of providerCandidates) {
        const value = process.env[candidate.envName];
        if (isConfiguredEnvironmentValue(value)) config[candidate.envName] = value as string;
      }
      const result = await provider.lookup(config, input);
      const contacts = extractContactsFromProvider(result, provider.name);
      const enrichedContact = contacts.find((contact) => hasEnrichedContact(contact));

      if (enrichedContact) {
        return {
          success: true,
          provider: provider.name,
          contacts,
          source: 'yellow-pages',
          metadata: result,
          loopMode,
          lead_records: Array.isArray(leadRecords) ? leadRecords : [],
          existing_leads: Array.isArray(leadRecords) ? leadRecords : [],
        };
      }

      if (loopMode === 'first') {
        break;
      }
    } catch (error) {
      logger.warn('Yellow pages provider lookup failed', {
        provider: provider.name,
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }

  return {
    success: true,
    provider: null,
    contacts: [],
    source: 'yellow-pages',
    mode: loopMode,
    message: 'Fallback lookup did not produce an enriched contact. Returning the existing lead records unchanged.',
    lead_records: Array.isArray(leadRecords) ? leadRecords : [],
    existing_leads: Array.isArray(leadRecords) ? leadRecords : [],
  };
}

const businessLookupTool: McpTool = {
  name: 'yellow_pages_business_lookup',
  description: 'Fallback directory-style lookup for contact details when enrichment yields no usable company or person email.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Company domain to resolve.' },
      company_name: { type: 'string', description: 'Company name to resolve.' },
      query: { type: 'string', description: 'Free-text lookup for a business or local entity.' },
      location: { type: 'string', description: 'Optional city or region for directory search.' },
    },
    required: ['domain'],
  },
  async execute(input: unknown) {
    const payload = input as { domain?: string; company_name?: string; query?: string; location?: string; lead_records?: unknown[]; leads?: unknown[]; records?: unknown[]; existing_leads?: unknown[] };
    const domain = payload.domain?.trim();
    const companyName = payload.company_name?.trim();
    const query = payload.query?.trim();
    const location = payload.location?.trim();

    const existingLeadRecords = payload.lead_records ?? payload.leads ?? payload.records ?? payload.existing_leads;

    const lookupInput: Record<string, string | number | undefined> = {
      domain: domain || undefined,
      company_name: companyName || undefined,
      query: query || companyName || domain || undefined,
      location: location || undefined,
    };

    return lookupFallbackContact(lookupInput, existingLeadRecords);
  },
};

const personLookupTool: McpTool = {
  name: 'yellow_pages_person_lookup',
  description: 'Fallback person lookup by name, domain, or company context using the first configured directory-style provider.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person name to search.' },
      company_name: { type: 'string', description: 'Company to contextualize the search.' },
      domain: { type: 'string', description: 'Domain to match against the company.' },
    },
    required: ['name'],
  },
  async execute(input: unknown) {
    const payload = input as { name?: string; company_name?: string; domain?: string; lead_records?: unknown[]; leads?: unknown[]; records?: unknown[]; existing_leads?: unknown[] };
    const existingLeadRecords = payload.lead_records ?? payload.leads ?? payload.records ?? payload.existing_leads;

    return lookupFallbackContact(
      {
        query: payload.name,
        company_name: payload.company_name,
        domain: payload.domain,
      },
      existingLeadRecords,
    );
  },
};

export function createServer(config?: Partial<YellowPagesServerConfig>): McpServer {
  const tools: McpTool[] = [businessLookupTool, personLookupTool];
  const loopMode = normalizeLoopMode(config?.loopMode ?? process.env.MT_YELLOW_PAGES_LOOP_MODE);

  return {
    name: 'yellow-pages',
    version: '0.1.0',
    tools,
    start() {
      const host = process.env.MCP_HOST ?? process.env.HOST ?? '127.0.0.1';
      const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8168);

      const httpServer = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: 'yellow-pages', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'yellow-pages', version: '0.1.0', tools: tools.map((t) => t.name) }));
          return;
        }

        if (req.method === 'POST') {
          const toolName = requestUrl.pathname.replace(/^\/tools\//, '');
          const tool = tools.find((candidate) => candidate.name === toolName);

          if (!tool) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Unknown tool: ${toolName || requestUrl.pathname}` }));
            return;
          }

          let body: unknown;
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid JSON body';
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: message }));
            return;
          }

          try {
            const result = await tool.execute(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, tool: tool.name, result }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: message }));
          }
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      });

      httpServer.listen(port, host, () => {
        logger.info('MCP yellow-pages HTTP server ready', {
          host,
          port,
          tools: tools.map((t) => t.name),
        });
      });
    },
  };
}
