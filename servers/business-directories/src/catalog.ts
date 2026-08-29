import directorySourcesSeed from './seeds/directory-sources.json';
import peopleSourcesSeed from './seeds/people-sources.json';

export type EntityType = 'business' | 'person';
export type Region = 'north-america' | 'south-america' | 'europe' | 'africa' | 'asia' | 'oceania';

export interface DirectorySource {
  id: string;
  name: string;
  kind: 'directory' | 'registry' | 'social' | 'professional' | 'community';
  entity_types: EntityType[];
  region: Region;
  country: string;
  url?: string;
  search_url_base?: string;
  search_modes: Array<'query' | 'company_name' | 'person_name' | 'domain' | 'location'>;
  notes?: string;
  recommended_for?: string[];
}

export const directorySources: DirectorySource[] = [...directorySourcesSeed, ...peopleSourcesSeed] as DirectorySource[];

export function getSourcesByScope(
  filters?: {
    entityType?: EntityType;
    region?: Region;
    country?: string;
    limit?: number;
  },
): DirectorySource[] {
  const filtered = directorySources.filter((source) => {
    if (filters?.entityType && !source.entity_types.includes(filters.entityType)) return false;
    if (filters?.region && source.region !== filters.region) return false;
    if (filters?.country && source.country !== filters.country.toLowerCase()) return false;
    return true;
  });

  return typeof filters?.limit === 'number' ? filtered.slice(0, filters.limit) : filtered;
}
