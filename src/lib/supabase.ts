import { createClient } from '@supabase/supabase-js';

// Official direct Supabase endpoint for CinemaMV
export const DIRECT_SUPABASE_URL = 'https://kniazspphdhdhcjfroku.supabase.co';
export const DIRECT_SUPABASE_ANON_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWF6c3BwaGRoZGhjamZyb2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Mzg0NDMsImV4cCI6MjEwNjMxNDQ0M30.s_iDSIVREIpQkAr-pGv27WTNElQnQvkoHDgIoYRcfH4';

/**
 * Resolves the Supabase URL.
 * Automatically detects and clears misconfigured proxy URLs (such as api.cinemamv.online
 * when routing to Vercel instead of Cloudflare) to prevent locking users out of checkout
 * or admin pages with CORS errors.
 */
const getInitialSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mv_supabase_proxy_url');
    // If user saved api.cinemamv.online, it currently resolves to Vercel (missing CORS headers & worker routing).
    // Automatically purge it so checkout, tenant admin, and super admin work immediately!
    if (saved && (saved.includes('api.cinemamv.online') || !saved.startsWith('http'))) {
      console.warn('[Supabase Config] Purged unrouted proxy URL from localStorage:', saved);
      localStorage.removeItem('mv_supabase_proxy_url');
      return DIRECT_SUPABASE_URL;
    }
    if (saved && saved.trim().startsWith('http')) {
      return saved.trim();
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

export const supabase = createClient(supabaseUrl, supabaseKey);

