import { createClient } from '@supabase/supabase-js';

// Support direct Supabase or Cloudflare Edge Proxy (e.g. https://api.cinemamv.online)
// to slash database egress and eliminate cross-origin CORS on subdomains.
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_PROXY_URL || 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://placeholder.supabase.co';

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = () => {
  return (
    Boolean(import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROXY_URL) && 
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) &&
    supabaseUrl !== 'https://placeholder.supabase.co'
  );
};

export const supabase = createClient(supabaseUrl, supabaseKey);
