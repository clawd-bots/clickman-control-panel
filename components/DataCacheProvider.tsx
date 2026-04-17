'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

/** In-memory GET response cache for the browser session (fast repeat date-range switches). */
const SESSION_TTL_MS = 60 * 60 * 1000;

type CachedEntry = {
  bodyText: string;
  status: number;
  headers: Headers;
  fetchedAt: number;
};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

type DataCacheContextValue = {
  cachedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef(new Map<string, CachedEntry>());

  const cachedFetch = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method?.toUpperCase() ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method.toUpperCase() : 'GET');
    if (method !== 'GET') {
      return fetch(input, init);
    }
    const key = requestUrl(input);
    const hit = mapRef.current.get(key);
    if (hit && Date.now() - hit.fetchedAt < SESSION_TTL_MS) {
      return Promise.resolve(new Response(hit.bodyText, { status: hit.status, headers: hit.headers }));
    }
    return fetch(input, init).then(async (res) => {
      const text = await res.clone().text();
      if (res.ok) {
        mapRef.current.set(key, {
          bodyText: text,
          status: res.status,
          headers: new Headers(res.headers),
          fetchedAt: Date.now(),
        });
      }
      return new Response(text, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    });
  }, []);

  const value = useMemo(() => ({ cachedFetch }), [cachedFetch]);

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>;
}

/** Drop-in `fetch` replacement backed by the session cache (GET only). */
export function useCachedFetch(): typeof fetch {
  const ctx = useContext(DataCacheContext);
  return useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      if (!ctx) return fetch(input, init);
      return ctx.cachedFetch(input, init);
    },
    [ctx],
  );
}
