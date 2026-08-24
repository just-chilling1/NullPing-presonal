"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDefaultPromoLinks, type PromoLinksSettings } from "@/lib/promo-links";
import { supabase } from "@/lib/supabase";

interface PromoLinksContextValue {
  settings: PromoLinksSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  updateLocal: (next: PromoLinksSettings) => void;
}

const PromoLinksContext = createContext<PromoLinksContextValue | null>(null);

export function PromoLinksProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PromoLinksSettings>(() => getDefaultPromoLinks());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSettings(getDefaultPromoLinks());
        return;
      }

      const res = await fetch("/api/promo-links", {
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) return;

      const data = (await res.json()) as PromoLinksSettings;
      setSettings(data);
    } catch {
      // Keep config defaults on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateLocal = useCallback((next: PromoLinksSettings) => {
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({ settings, loading, refresh, updateLocal }),
    [settings, loading, refresh, updateLocal]
  );

  return <PromoLinksContext.Provider value={value}>{children}</PromoLinksContext.Provider>;
}

export function usePromoLinks(): PromoLinksContextValue {
  const ctx = useContext(PromoLinksContext);
  if (!ctx) {
    return {
      settings: getDefaultPromoLinks(),
      loading: false,
      refresh: async () => {},
      updateLocal: () => {},
    };
  }
  return ctx;
}
