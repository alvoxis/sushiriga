import { locations as allLocations } from '@/data/locations';
import type { Location } from '@/types';

export interface LocationService {
  /** Locations that currently accept pickup orders. */
  listActive(): Promise<Location[]>;
  get(id: string): Promise<Location | undefined>;
}

export function createStaticLocationService(locations: Location[] = allLocations): LocationService {
  return {
    listActive: async () => locations.filter((l) => l.active),
    get: async (id) => locations.find((l) => l.id === id),
  };
}
