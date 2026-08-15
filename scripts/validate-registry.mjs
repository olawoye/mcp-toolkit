import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const toolsData = JSON.parse(readFileSync(resolve(rootDir, 'registry/tools.json'), 'utf8'));
const serversData = JSON.parse(readFileSync(resolve(rootDir, 'registry/servers.json'), 'utf8'));

const tools = Array.isArray(toolsData.tools) ? toolsData.tools : [];
const servers = new Set((Array.isArray(serversData.servers) ? serversData.servers : []).map((server) => server.name));

const errors = [];
const seenNames = new Set();

for (const tool of tools) {
  if (!tool || typeof tool !== 'object') {
    errors.push('Encountered a non-object tool entry.');
    continue;
  }

  const { name, server, description, category, status, capabilities } = tool;

  if (!name || typeof name !== 'string') {
    errors.push('Tool entry is missing a valid name.');
  }

  if (seenNames.has(name)) {
    errors.push(`Duplicate tool name detected: ${name}`);
  } else if (name) {
    seenNames.add(name);
  }

  if (!server || typeof server !== 'string') {
    errors.push(`Tool ${name ?? '<unknown>'} is missing a valid server name.`);
  } else if (!servers.has(server)) {
    errors.push(`Tool ${name} references unknown server: ${server}`);
  }

  if (!description || typeof description !== 'string') {
    errors.push(`Tool ${name ?? '<unknown>'} is missing a description.`);
  }

  if (!category || typeof category !== 'string') {
    errors.push(`Tool ${name ?? '<unknown>'} is missing a category.`);
  }

  if (!status || typeof status !== 'string') {
    errors.push(`Tool ${name ?? '<unknown>'} is missing a status.`);
  }

  if (!Array.isArray(capabilities)) {
    errors.push(`Tool ${name ?? '<unknown>'} has a non-array capabilities list.`);
    continue;
  }

  const seenToolCapabilities = new Set();
  for (const capability of capabilities) {
    if (typeof capability !== 'string' || capability.trim().length === 0) {
      errors.push(`Tool ${name ?? '<unknown>'} contains an invalid capability entry.`);
      continue;
    }

    if (seenToolCapabilities.has(capability)) {
      errors.push(`Tool ${name ?? '<unknown>'} contains a duplicate capability entry: ${capability}`);
      continue;
    }

    seenToolCapabilities.add(capability);
  }
}

if (errors.length > 0) {
  console.error('Registry validation failed.');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Registry validation passed: ${tools.length} tools registered across ${servers.size} declared servers.`);
