export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  server: string;
  description: string;
  capabilities: string[];
  inputSchema: ToolInputSchema;
  execute(input: unknown): Promise<unknown>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(tools: ToolDefinition[] = []) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  byServer(server: string): ToolDefinition[] {
    return this.list().filter((tool) => tool.server === server);
  }

  byCapabilities(capabilities: string[]): ToolDefinition[] {
    const wanted = new Set(capabilities);
    return this.list().filter((tool) =>
      [...tool.capabilities].some((capability) => wanted.has(capability)),
    );
  }

  select(names: string[]): ToolDefinition[] {
    const selected: ToolDefinition[] = [];
    for (const name of names) {
      const tool = this.get(name);
      if (tool) selected.push(tool);
    }
    return selected;
  }
}

export function createToolRegistry(tools: ToolDefinition[] = []): ToolRegistry {
  return new ToolRegistry(tools);
}
