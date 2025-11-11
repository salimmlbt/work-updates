
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Project, ProjectType, Task, Client, Profile, Team, Role } from '@/lib/types';

type AnyData = Project | ProjectType | Task | Client | Profile | Team | Role;

const areArraysEqualById = <T extends { id: any }>(a: T[] | null, b: T[] | null): boolean => {
    if (a === null && b === null) return true;
    if (!a || !b || a.length !== b.length) return false;
    
    const aIds = a.map(item => item.id).sort();
    const bIds = b.map(item => item.id).sort();

    return aIds.every((id, index) => id === bIds[index]);
};

interface ClientCacheContextType {
  cache: { [key: string]: any[] | null };
  setCache: (key: string, data: any[] | null) => void;
}

const ClientCacheContext = createContext<ClientCacheContextType | undefined>(undefined);

export function ClientCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCacheState] = useState<{ [key: string]: any[] | null }>({});

  const setCache = useCallback((key: string, data: any[] | null) => {
    setCacheState((prevCache) => {
      if (areArraysEqualById(prevCache[key] || null, data)) {
        return prevCache;
      }
      return { ...prevCache, [key]: data };
    });
  }, []);

  const value = React.useMemo(
    () => ({ cache, setCache }),
    [cache, setCache]
  );

  return (
    <ClientCacheContext.Provider value={value}>
      {children}
    </ClientCacheContext.Provider>
  );
}

export function useClientCache() {
  const context = useContext(ClientCacheContext);
  if (!context) {
    throw new Error('❌ useClientCache must be used within a <ClientCacheProvider>');
  }
  return context;
}
