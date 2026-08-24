"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { ArmedLink, ThemeConfig } from "../types";
import { defaultThemeConfig } from "../themes";
import { isValidAffiliateUrl, normalizeAffiliateUrl } from "../lib/affiliate-url";

import type { WizardStepNumber } from "../lib/wizard-step-props";
import { cachedClientFetch, invalidateClientFetchCache } from "@/lib/client-fetch-cache";
import { needsBlogSession, shouldStartFreshWizard } from "@/lib/blog-builder-routes";
import { warmBlogSession } from "@/lib/warm-route-data";
import { isFeatureEnabled } from "@/config/features.config";

export type BlogBuilderStep = 0 | 1 | 2 | 3;

interface BlogBuilderState {
  step: BlogBuilderStep;
  wizardUiStep: WizardStepNumber;
  hobby: string;
  territory: string;
  niche: string;
  suggestions: string[];
  armedLinks: ArmedLink[];
  deployArmedLinks: ArmedLink[];
  themeConfig: ThemeConfig;
  territoryChosen: boolean;
  linksArmed: boolean;
  themeChosen: boolean;
  deployed: boolean;
  siteId: string | null;
  siteSlug: string | null;
  isGenerating: boolean;
  generationLog: string[];
}

interface BlogBuilderContextType extends BlogBuilderState {
  sessionLoaded: boolean;
  setHobby: (h: string) => void;
  setTerritory: (t: string) => void;
  setNiche: (n: string) => void;
  setSuggestions: (s: string[]) => void;
  setArmedLinks: (links: ArmedLink[]) => void;
  setThemeConfig: (config: ThemeConfig) => void;
  armLinks: (links: ArmedLink[]) => void;
  chooseTerritory: (niche: string, territory?: string) => void;
  chooseTheme: (config: ThemeConfig) => void;
  saveLinksToVault: (links: ArmedLink[]) => Promise<void>;
  markDeployed: (siteId: string, siteSlug: string) => void;
  appendLog: (line: string) => void;
  setGenerating: (v: boolean) => void;
  resetWizard: () => Promise<void>;
  beginNewSiteGeneration: () => void;
  startFreshOfferWizard: () => void;
  setWizardUiStep: (step: WizardStepNumber) => void;
  blogProgress: number;
}

const defaultState: BlogBuilderState = {
  step: 0,
  wizardUiStep: 1,
  hobby: "",
  territory: "",
  niche: "",
  suggestions: [],
  armedLinks: [],
  deployArmedLinks: [],
  themeConfig: defaultThemeConfig(),
  territoryChosen: false,
  linksArmed: false,
  themeChosen: false,
  deployed: false,
  siteId: null,
  siteSlug: null,
  isGenerating: false,
  generationLog: [],
};

interface DbSessionRow {
  step?: number;
  hobby?: string;
  territory?: string;
  niche?: string;
  suggestions?: string[];
  territory_chosen?: boolean;
  links_armed?: boolean;
  theme_chosen?: boolean;
  theme_config?: ThemeConfig;
  deploy_armed_links?: ArmedLink[];
  deployed?: boolean;
  site_id?: string | null;
  site_slug?: string | null;
  is_generating?: boolean;
  generation_log?: string[];
  wizard_ui_step?: number;
}

function clampWizardUiStep(value: number | undefined, flags: {
  linksArmed: boolean;
  territoryChosen: boolean;
  themeChosen: boolean;
}): WizardStepNumber {
  if (typeof value === "number" && value >= 1 && value <= 4) {
    return value as WizardStepNumber;
  }
  if (flags.themeChosen) return 4;
  if (flags.territoryChosen) return 3;
  if (flags.linksArmed) return 2;
  return 1;
}

function mapSessionFromDb(row: DbSessionRow): Partial<BlogBuilderState> {
  const linksArmed = row.links_armed ?? false;
  const territoryChosen = row.territory_chosen ?? false;
  const themeChosen = row.theme_chosen ?? false;

  return {
    step: (row.step ?? 0) as BlogBuilderStep,
    wizardUiStep: clampWizardUiStep(row.wizard_ui_step, {
      linksArmed,
      territoryChosen,
      themeChosen,
    }),
    hobby: row.hobby ?? "",
    territory: row.territory ?? "",
    niche: row.niche ?? row.territory ?? "",
    suggestions: row.suggestions ?? [],
    territoryChosen,
    linksArmed,
    themeChosen,
    themeConfig: row.theme_config ?? defaultThemeConfig(),
    deployArmedLinks: row.deploy_armed_links ?? [],
    deployed: row.deployed ?? false,
    siteId: row.site_id ?? null,
    siteSlug: row.site_slug ?? null,
    isGenerating: row.is_generating ?? false,
    generationLog: Array.isArray(row.generation_log) ? row.generation_log : [],
  };
}

function persistPayload(state: BlogBuilderState) {
  return {
    step: state.step,
    wizardUiStep: state.wizardUiStep,
    hobby: state.hobby,
    territory: state.territory,
    niche: state.niche,
    suggestions: state.suggestions,
    territoryChosen: state.territoryChosen,
    linksArmed: state.linksArmed,
    themeChosen: state.themeChosen,
    themeConfig: state.themeConfig,
    deployArmedLinks: state.deployArmedLinks,
    deployed: state.deployed,
    siteId: state.siteId,
    siteSlug: state.siteSlug,
    isGenerating: state.isGenerating,
    generationLog: state.generationLog,
  };
}

function vaultReadyLinks(links: ArmedLink[]): ArmedLink[] {
  const seen = new Set<string>();
  return links
    .map((link) => ({
      ...link,
      url: normalizeAffiliateUrl(link.url),
    }))
    .filter((link) => {
      const url = link.url.trim();
      if (!isValidAffiliateUrl(url) || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

const BlogBuilderContext = createContext<BlogBuilderContextType | undefined>(undefined);

export function BlogBuilderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<BlogBuilderState>(defaultState);
  const [sessionLoaded, setSessionLoaded] = useState(() => !needsBlogSession(pathname));
  const persistReady = useRef(false);
  const sessionFetched = useRef(false);
  const sessionLoadPromise = useRef<Promise<void> | null>(null);

  const loadSession = useCallback(async () => {
    if (sessionFetched.current) return;

    if (!sessionLoadPromise.current) {
      sessionLoadPromise.current = (async () => {
        try {
          const vaultOnly = !isFeatureEnabled("blog-builder");

          if (vaultOnly || shouldStartFreshWizard(pathname)) {
            const vaultJson = await cachedClientFetch<{ links: ArmedLink[] }>("/api/blog/link-vault");
            const vaultLinks = Array.isArray(vaultJson.links) ? vaultJson.links : [];
            setState((s) => ({
              ...s,
              ...(vaultOnly ? {} : defaultState),
              armedLinks: vaultLinks,
            }));
            return;
          }

          const [sessionJson, vaultJson] = await Promise.all([
            cachedClientFetch<{ session: DbSessionRow | null }>("/api/blog/session"),
            cachedClientFetch<{ links: ArmedLink[] }>("/api/blog/link-vault"),
          ]);

          const fromSession = sessionJson.session ? mapSessionFromDb(sessionJson.session) : {};
          const vaultLinks = Array.isArray(vaultJson.links) ? vaultJson.links : [];

          setState((s) => ({
            ...s,
            ...fromSession,
            armedLinks: vaultLinks.length > 0 ? vaultLinks : s.armedLinks,
          }));
        } finally {
          sessionFetched.current = true;
          setSessionLoaded(true);
          persistReady.current = true;
        }
      })();
    }

    await sessionLoadPromise.current;
  }, [pathname]);

  useEffect(() => {
    if (!needsBlogSession(pathname)) {
      setSessionLoaded(true);
      return;
    }
    warmBlogSession();
    if (sessionFetched.current) {
      setSessionLoaded(true);
      return;
    }
    setSessionLoaded(false);
    void loadSession();
  }, [pathname, loadSession]);

  const persistToServer = useCallback((payload: ReturnType<typeof persistPayload>) => {
    void fetch("/api/blog/session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  }, []);

  useEffect(() => {
    if (!persistReady.current || !needsBlogSession(pathname) || !isFeatureEnabled("blog-builder")) return;

    const timer = setTimeout(() => {
      persistToServer(persistPayload(state));
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pathname,
    state.step,
    state.wizardUiStep,
    state.hobby,
    state.territory,
    state.niche,
    state.suggestions,
    state.territoryChosen,
    state.linksArmed,
    state.themeChosen,
    state.themeConfig,
    state.deployArmedLinks,
    state.deployed,
    state.siteId,
    state.siteSlug,
    state.generationLog,
    persistToServer,
  ]);

  const persistVault = useCallback(async (links: ArmedLink[]) => {
    const res = await fetch("/api/blog/link-vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ links }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save link vault");
    }
    invalidateClientFetchCache("/api/blog/link-vault");
  }, []);

  const setHobby = useCallback((hobby: string) => {
    setState((s) => ({ ...s, hobby }));
  }, []);

  const setTerritory = useCallback((territory: string) => {
    setState((s) => ({ ...s, territory }));
  }, []);

  const setNiche = useCallback((niche: string) => {
    setState((s) => ({ ...s, niche }));
  }, []);

  const setSuggestions = useCallback((suggestions: string[]) => {
    setState((s) => ({ ...s, suggestions }));
  }, []);

  const setArmedLinks = useCallback((armedLinks: ArmedLink[]) => {
    setState((s) => ({ ...s, armedLinks }));
  }, []);

  const setThemeConfig = useCallback((themeConfig: ThemeConfig) => {
    setState((s) => ({ ...s, themeConfig }));
  }, []);

  const saveLinksToVault = useCallback(
    async (links: ArmedLink[]) => {
      const cleaned = vaultReadyLinks(links);
      setState((s) => ({ ...s, armedLinks: cleaned }));
      await persistVault(cleaned);
    },
    [persistVault]
  );

  const armLinks = useCallback((deployArmedLinks: ArmedLink[]) => {
    const cleaned = vaultReadyLinks(deployArmedLinks);
    setState((s) => ({
      ...s,
      deployArmedLinks: cleaned,
      linksArmed: cleaned.length > 0,
      step: 1,
    }));
  }, []);

  const chooseTerritory = useCallback((niche: string, territory?: string) => {
    const label = territory ?? niche;
    setState((s) => ({
      ...s,
      niche,
      territory: label,
      territoryChosen: true,
      themeChosen: false,
      step: 2,
    }));
  }, []);

  const chooseTheme = useCallback((themeConfig: ThemeConfig) => {
    setState((s) => ({
      ...s,
      themeConfig,
      themeChosen: true,
      step: 3,
    }));
  }, []);

  const markDeployed = useCallback((siteId: string, siteSlug: string) => {
    setState((s) => ({
      ...s,
      siteId,
      siteSlug,
      deployed: true,
      isGenerating: false,
    }));
  }, []);

  const appendLog = useCallback((line: string) => {
    setState((s) => ({
      ...s,
      generationLog: [...s.generationLog, line],
    }));
  }, []);

  const setGenerating = useCallback(
    (isGenerating: boolean) => {
      setState((s) => {
        const next = {
          ...s,
          isGenerating,
          generationLog: isGenerating ? [] : s.generationLog,
        };
        persistToServer(persistPayload(next));
        return next;
      });
    },
    [persistToServer]
  );

  const resetWizard = useCallback(async () => {
    await fetch("/api/blog/session", { method: "DELETE", cache: "no-store" });
    invalidateClientFetchCache("/api/blog/session");
    setState(defaultState);
  }, []);

  const setWizardUiStep = useCallback((wizardUiStep: WizardStepNumber) => {
    setState((s) => ({ ...s, wizardUiStep }));
  }, []);

  const beginNewSiteGeneration = useCallback(() => {
    setState((s) => ({
      ...s,
      deployed: false,
      siteId: null,
      siteSlug: null,
      step: 3,
      generationLog: [],
    }));
  }, []);

  /** Reset wizard progress for a new offer without clearing the link vault. */
  const startFreshOfferWizard = useCallback(() => {
    setState((s) => ({
      ...s,
      step: 0,
      wizardUiStep: 1,
      hobby: "",
      territory: "",
      niche: "",
      suggestions: [],
      deployArmedLinks: [],
      territoryChosen: false,
      linksArmed: false,
      themeChosen: false,
      themeConfig: defaultThemeConfig(),
      deployed: false,
      siteId: null,
      siteSlug: null,
      isGenerating: false,
      generationLog: [],
    }));
  }, []);

  let blogProgress = 0;
  if (state.deployed) blogProgress = 4;
  else if (state.themeChosen || state.step >= 3) blogProgress = 3;
  else if (state.territoryChosen || state.step >= 2) blogProgress = 2;
  else if (state.linksArmed || state.step >= 1) blogProgress = 1;

  return (
    <BlogBuilderContext.Provider
      value={{
        ...state,
        sessionLoaded,
        setHobby,
        setTerritory,
        setNiche,
        setSuggestions,
        setArmedLinks,
        setThemeConfig,
        armLinks,
        chooseTerritory,
        chooseTheme,
        saveLinksToVault,
        markDeployed,
        appendLog,
        setGenerating,
        resetWizard,
        beginNewSiteGeneration,
        startFreshOfferWizard,
        setWizardUiStep,
        blogProgress,
      }}
    >
      {children}
    </BlogBuilderContext.Provider>
  );
}

export function useBlogBuilder() {
  const ctx = useContext(BlogBuilderContext);
  if (!ctx) throw new Error("useBlogBuilder must be used within BlogBuilderProvider");
  return ctx;
}
