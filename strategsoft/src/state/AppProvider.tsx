import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyDatabase, type AppDatabase } from "../types/models";
import { localRepository } from "../data/localRepository";
import { createDemoDatabase } from "../data/demo";

interface AppContextValue {
  db: AppDatabase;
  loading: boolean;
  error: string | null;
  update: (mutator: (draft: AppDatabase) => AppDatabase | void) => Promise<void>;
  replace: (next: AppDatabase) => Promise<void>;
  loadDemo: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<AppDatabase>(emptyDatabase());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await localRepository.load();
        if (!cancelled) setDb(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: AppDatabase) => {
    setDb(next);
    await localRepository.save(next);
  }, []);

  const update = useCallback(
    async (mutator: (draft: AppDatabase) => AppDatabase | void) => {
      const clone: AppDatabase = JSON.parse(JSON.stringify(db));
      const result = mutator(clone);
      await persist(result ?? clone);
    },
    [db, persist]
  );

  const replace = useCallback(async (next: AppDatabase) => persist(next), [persist]);
  const loadDemo = useCallback(async () => persist(createDemoDatabase()), [persist]);
  const resetAll = useCallback(async () => persist(emptyDatabase()), [persist]);

  const value = useMemo(
    () => ({ db, loading, error, update, replace, loadDemo, resetAll }),
    [db, loading, error, update, replace, loadDemo, resetAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
