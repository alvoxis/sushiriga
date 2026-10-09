import { useEffect, useState } from 'react';
import { useServices } from '@/services';
import type { Location } from '@/types';

/**
 * Active pickup locations from the LocationService. Components never import location data
 * directly, so a second location (or backend-managed data) needs no UI changes.
 */
export function useActiveLocations(): Location[] {
  const { locations } = useServices();
  const [list, setList] = useState<Location[]>([]);
  useEffect(() => {
    let active = true;
    locations.listActive().then((loaded) => active && setList(loaded));
    return () => {
      active = false;
    };
  }, [locations]);
  return list;
}

/** A single location by id (also inactive ones — e.g. for old orders). */
export function useLocation(id: string | undefined): Location | undefined {
  const { locations } = useServices();
  const [location, setLocation] = useState<Location | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    let active = true;
    locations.get(id).then((loaded) => active && setLocation(loaded));
    return () => {
      active = false;
    };
  }, [locations, id]);
  return location;
}
