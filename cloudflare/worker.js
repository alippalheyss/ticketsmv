/**
 * Cloudflare Worker: CinemaMV Edge Gateway
 *
 * Bind this ONE worker to the route  *.cinemamv.online/*  (and cinemamv.online/*).
 * It works for every existing and future cinema subdomain automatically:
 *
 *   /api/supabase/*              -> Supabase (edge cached, CORS-safe)      [all hosts]
 *   /rest|auth|storage|functions -> Supabase                               [api.cinemamv.online only]
 *   everything else              -> the website (Vercel origin)            [all hosts]
 *
 * The React app reads window.location.hostname to decide which cinema to show,
 * so serving the same index.html for every subdomain is correct.
 */

const SUPABASE_TARGET = 'https://kniazspphdhdhcjfroku.supabase.co';

// Where the website itself is hosted. Uses the stable *.vercel.app URL so it
// does not depend on Vercel's wildcard SSL certificate or DNS.
const SITE_ORIGIN = 'https://ticketsmv.vercel.app';

const API_PREFIX = '/api/supabase';
const API_HOST = 'api.cinemamv.online';
const SUPABASE_PATHS = ['/rest/', '/auth/', '/storage/', '/functions/', '/graphql/'];

// Short edge cache for public catalog reads (movies, showtimes, halls, tenants).
const EDGE_CACHE_TTL_SECONDS = 30;

const corsHeaders = (request) => ({
  'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ---- 1. Decide whether this is a database/API request -------------------
    let supabasePath = null;
    if (url.pathname === API_PREFIX || url.pathname.startsWith(API_PREFIX + '/')) {
      supabasePath = url.pathname.slice(API_PREFIX.length) || '/';
    } else if (url.hostname === API_HOST && SUPABASE_PATHS.some((p) => url.pathname.startsWith(p))) {
      supabasePath = url.pathname;
    }

    if (supabasePath !== null) {
      return proxyToSupabase(request, url, supabasePath, ctx);
    }

    // ---- 2. Everything else is the website ----------------------------------
    return proxyToSite(request, url);
  },
};

async function proxyToSite(request, url) {
  const target = new URL(url.pathname + url.search, SITE_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  // Tell the origin which subdomain the visitor really used (informational).
  headers.set('X-Forwarded-Host', url.hostname);

  const res = await fetch(target.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });

  // Keep any redirects on the visitor's own domain.
  const out = new Response(res.body, res);
  const loc = res.headers.get('Location');
  if (loc && loc.startsWith(SITE_ORIGIN)) {
    out.headers.set('Location', loc.replace(SITE_ORIGIN, url.origin));
  }
  return out;
}

async function proxyToSupabase(request, url, supabasePath, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const targetUrl = new URL(supabasePath + url.search, SUPABASE_TARGET);

  // Only cache public catalog reads. Never cache bookings or seat holds,
  // otherwise approvals / seat locks would look stale.
  const lower = targetUrl.toString().toLowerCase();
  // "kind=neq.booking" (catalog) is fine to cache; anything else mentioning bookings is not.
  const mentionsBookings = lower.replace('kind=neq.booking', '').includes('booking');
  const isCacheable =
    request.method === 'GET' &&
    supabasePath.startsWith('/rest/v1/cinema_records') &&
    !mentionsBookings;

  const cache = caches.default;
  const cacheKey = new Request(targetUrl.toString(), { method: 'GET' });

  if (isCacheable) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const h = new Headers(hit.headers);
      Object.entries(corsHeaders(request)).forEach(([k, v]) => h.set(k, v));
      h.set('X-Proxy-Cache', 'HIT');
      return new Response(hit.body, { status: hit.status, headers: h });
    }
  }

  const fwd = new Headers(request.headers);
  fwd.delete('host');
  fwd.delete('cf-connecting-ip');
  fwd.delete('cf-ray');

  try {
    const res = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: fwd,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });

    const h = new Headers(res.headers);
    Object.entries(corsHeaders(request)).forEach(([k, v]) => h.set(k, v));
    h.set('X-Proxy-Cache', 'MISS');

    if (isCacheable && res.status === 200) {
      const cacheHeaders = new Headers(h);
      cacheHeaders.set('Cache-Control', `public, max-age=${EDGE_CACHE_TTL_SECONDS}`);
      ctx.waitUntil(
        cache.put(cacheKey, new Response(res.clone().body, { status: 200, headers: cacheHeaders }))
      );
    }

    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Supabase proxy connection failed', details: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }
}
