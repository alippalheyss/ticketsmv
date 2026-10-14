import { createClient } from '@supabase/supabase-js';

// Official direct Supabase endpoint for CinemaMV
export const DIRECT_SUPABASE_URL = 'https://kniazspphdhdhcjfroku.supabase.co';
export const DIRECT_SUPABASE_ANON_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWF6c3BwaGRoZGhjamZyb2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Mzg0NDMsImV4cCI6MjEwNjMxNDQ0M30.s_iDSIVREIpQkAr-pGv27WTNElQnQvkoHDgIoYRcfH4';

/**
 * Universal Subdomain & Origin Resolver:
 * Supports cinemamv.online and all existing & dynamically created subdomains (*.cinemamv.online).
 * 
 * 1. On subdomains, routes through same-origin /api/supabase/ which completely bypasses
 *    browser cross-origin CORS preflight blocks.
 * 2. Uses direct Supabase WebSockets for Realtime so live updates never fail.
 */
const getInitialSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mv_supabase_proxy_url');
    // If user explicitly saved a custom proxy URL (like a .workers.dev URL or custom domain)
    if (saved && saved.startsWith('http')) {
      return saved.trim();
    }

    // If user cleared it or explicitly set to 'direct', use same-origin proxy or direct Supabase
    if (saved === 'direct') {
      const host = window.location.hostname;
      if (host.endsWith('cinemamv.online') || host === 'localhost' || host.endsWith('.localhost')) {
        return `${window.location.origin}/api/supabase/`;
      }
      return DIRECT_SUPABASE_URL;
    }

    const host = window.location.hostname;
    // For cinemamv.online, all cinema subdomains (*.cinemamv.online), and localhost:
    // Route via same-origin /api/supabase/ proxy rewritten by Vercel & Cloudflare Pages.
    if (host.endsWith('cinemamv.online') || host === 'localhost' || host.endsWith('.localhost')) {
      return `${window.location.origin}/api/supabase/`;
    }
  }

  const envProxy = import.meta.env.VITE_SUPABASE_PROXY_URL;
  if (envProxy && !envProxy.includes('api.cinemamv.online') && envProxy.trim().startsWith('http')) {
    return envProxy.trim();
  }

  return (
    import.meta.env.VITE_SUPABASE_URL || 
    DIRECT_SUPABASE_URL
  );
};

export const supabaseUrl = getInitialSupabaseUrl();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DIRECT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) && 
    Boolean(supabaseKey) &&
    supabaseUrl !== 'https://placeholder.supabase.co'
  );
};

/**
 * Custom WebSocket Transport that guarantees Supabase Realtime always connects
 * to the direct Supabase websocket cluster (wss://kniazspphdhdhcjfroku.supabase.co),
 * regardless of proxy rewrites or subdomains.
 */
const DirectRealtimeWebSocket = typeof window !== 'undefined' && window.WebSocket
  ? class extends WebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        const urlStr = String(url);
        const directWsUrl = urlStr.replace(
          /^wss?:\/\/[^\/]+(\/api\/supabase)?/,
          'wss://kniazspphdhdhcjfroku.supabase.co'
        );
        super(directWsUrl, protocols);
      }
    }
  : undefined;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: DirectRealtimeWebSocket as any,
  },
});
