/**
 * Cloudflare Pages Function: Native Edge Caching Proxy & Universal CORS Gateway
 * Automatically active on every domain and subdomain deployed on Cloudflare Pages.
 * 
 * Target: /api/supabase/* -> https://kniazspphdhdhcjfroku.supabase.co/*
 */

const SUPABASE_TARGET = 'https://kniazspphdhdhcjfroku.supabase.co';
const EDGE_CACHE_TTL_SECONDS = 60; // 60s CDN edge cache for public catalog

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '*';

  // 1. Handle CORS Preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 2. Strip /api/supabase prefix to build target URL
  const pathAfterPrefix = url.pathname.replace(/^\/api\/supabase/, '');
  const targetUrl = new URL(pathAfterPrefix + url.search, SUPABASE_TARGET);

  // 3. Edge caching for public catalog GET queries
  const cache = caches.default;
  const isPublicGet = request.method === 'GET' && 
    (url.pathname.includes('/rest/v1/cinema_records') || url.pathname.includes('/rest/v1/cinema_seat_holds'));

  if (isPublicGet) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const newHeaders = new Headers(cachedResponse.headers);
      newHeaders.set('Access-Control-Allow-Origin', origin);
      newHeaders.set('Access-Control-Allow-Credentials', 'true');
      newHeaders.set('X-Proxy-Cache', 'HIT');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: newHeaders,
      });
    }
  }

  // 4. Forward request to Supabase
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('Host', new URL(SUPABASE_TARGET).host);
  forwardHeaders.delete('cf-connecting-ip');
  forwardHeaders.delete('cf-ray');

  const supabaseRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: forwardHeaders,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(supabaseRequest);
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', origin);
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('X-Proxy-Cache', 'MISS');

    if (isPublicGet && response.status === 200) {
      responseHeaders.set('Cache-Control', `public, max-age=${EDGE_CACHE_TTL_SECONDS}, stale-while-revalidate=300`);
      const responseToCache = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
      context.waitUntil(cache.put(request, responseToCache));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Supabase proxy connection failed', details: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
    });
  }
}
