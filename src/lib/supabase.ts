import { createClient } from '@supabase/supabase-js';

// Support direct Supabase or Cloudflare Edge Proxy (e.g. https://api.cinemamv.online)
// to slash database egress and eliminate cross-origin CORS on subdomains.
const getInitialSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mv_supabase_proxy_url');
    if (saved && saved.trim().startsWith('http')) return saved.trim();
  }
  return (
    import.meta.env.VITE_SUPABASE_PROXY_URL || 
    import.meta.env.VITE_SUPABASE_URL || 
    'https://placeholder.supabase.co'
  );
};

export const supabaseUrl = getInitialSupabaseUrl();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return (
    Boolean(import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROXY_URL || (typeof window !== 'undefined' && localStorage.getItem('mv_supabase_proxy_url'))) && 
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) &&
    supabaseUrl !== 'https://placeholder.supabase.co'
  );
};

export const supabase = createClient(supabaseUrl, supabaseKey);
