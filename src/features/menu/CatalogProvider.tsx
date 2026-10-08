import { useEffect, useState, type ReactNode } from 'react';
import { useServices } from '@/services';
import type { Catalog } from './catalog';
import { CatalogContext } from './CatalogContext';

/** Loads the catalog once from the CatalogService and shares it with the whole app. */
export function CatalogProvider({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { catalog: service } = useServices();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let active = true;
    service.getCatalog().then((loaded) => {
      if (active) setCatalog(loaded);
    });
    return () => {
      active = false;
    };
  }, [service]);

  if (!catalog) return <>{fallback}</>;
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}
