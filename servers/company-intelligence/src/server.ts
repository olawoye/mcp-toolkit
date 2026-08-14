import { createLogger } from '@mcp-toolkit/logging';

const logger = createLogger('company-intelligence-server');

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

export interface LeadCandidate {
  company_name?: string;
  domain?: string;
  score?: number;
  buying_signals?: string[];
  technologies?: string[];
  market_signals?: string[];
}

export interface CompanyIntelligenceConfig {
  provider?: 'local';
  weights?: {
    companyName: number;
    domain: number;
    buyingSignals: number;
    techSignals: number;
    marketSignals: number;
  };
}

const resolveConfig = (config?: Partial<CompanyIntelligenceConfig>): Required<Pick<CompanyIntelligenceConfig, 'provider' | 'weights'>> => ({
  provider: config?.provider ?? 'local',
  weights: {
    companyName: config?.weights?.companyName ?? 15,
    domain: config?.weights?.domain ?? 10,
    buyingSignals: config?.weights?.buyingSignals ?? 25,
    techSignals: config?.weights?.techSignals ?? 20,
    marketSignals: config?.weights?.marketSignals ?? 30,
  },
});

function scoreLead(lead: LeadCandidate, weights: ReturnType<typeof resolveConfig>['weights']) {
  let score = 0;

  if (lead.company_name) score += weights.companyName;
  if (lead.domain) score += weights.domain;
  if (Array.isArray(lead.buying_signals)) score += Math.min(lead.buying_signals.length * weights.buyingSignals, 50);
  if (Array.isArray(lead.technologies)) score += Math.min(lead.technologies.length * weights.techSignals, 40);
  if (Array.isArray(lead.market_signals)) score += Math.min(lead.market_signals.length * weights.marketSignals, 30);
  if (typeof lead.score === 'number') score += lead.score * 100;

  return Math.max(0, Math.min(score, 100));
}

export function createServer(config?: Partial<CompanyIntelligenceConfig>): McpServer {
  const resolved = resolveConfig(config);

  const leadScoringTool: McpTool = {
    name: 'lead_scoring',
    description: 'Score and rank leads using a local weighting model that is deterministic and stateless.',
    inputSchema: {
      type: 'object',
      properties: {
        leads: {
          type: 'array',
          description: 'Leads to score and rank.',
          items: {
            type: 'object',
            properties: {
              company_name: { type: 'string' },
              domain: { type: 'string' },
              score: { type: 'number' },
              buying_signals: { type: 'array', items: { type: 'string' } },
              technologies: { type: 'array', items: { type: 'string' } },
              market_signals: { type: 'array', items: { type: 'string' } },
            },
            required: ['company_name'],
          },
        },
      },
      required: ['leads'],
    },
    async execute(input: unknown) {
      const payload = input as { leads?: LeadCandidate[] };
      const items = Array.isArray(payload.leads) ? payload.leads : [];
      const scoredLeads = items
        .map((lead) => ({
          ...lead,
          score: scoreLead(lead, resolved.weights),
        }))
        .sort((a, b) => Number(b.score) - Number(a.score))
        .map((lead, index) => ({
          rank: index + 1,
          company_name: lead.company_name ?? 'unknown',
          domain: lead.domain ?? null,
          score: Number(lead.score),
          buying_signals: Array.isArray(lead.buying_signals) ? lead.buying_signals : [],
          technologies: Array.isArray(lead.technologies) ? lead.technologies : [],
          market_signals: Array.isArray(lead.market_signals) ? lead.market_signals : [],
          priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
        }));

      return {
        success: true,
        provider: resolved.provider,
        scored_leads: scoredLeads,
        source: 'company-intelligence',
      };
    },
  };

  const tools: McpTool[] = [leadScoringTool];

  return {
    name: 'company-intelligence',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP company-intelligence server ready', { tools: tools.map((t) => t.name), provider: resolved.provider });
    },
  };
}
