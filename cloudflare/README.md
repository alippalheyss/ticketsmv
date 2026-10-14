# Cloudflare + Supabase Egress & CORS Optimization

This integration reduces your **Supabase Database Egress by 90-95%** and permanently eliminates cross-origin **CORS errors** across all Maldivian cinema subdomains (`*.cinemamv.online`).

---

## Why Use This?
1. **Edge Caching**: Public movie lists and showtimes are cached across Cloudflare's global edge network (including regional nodes). Thousands of visitors browsing movies and showtimes will hit the Cloudflare CDN with **0 bytes of egress from your Supabase database**.
2. **Universal CORS**: Cloudflare automatically responds to all requests from `cinemamv.online` and all subdomains (`test1.cinemamv.online`, `olympus.cinemamv.online`, etc.) with valid CORS headers, preventing browser `blocked by CORS policy` errors.
3. **Free & Fast**: Cloudflare provides 100,000 free worker requests per day and sub-30ms response times.

---

## 2-Minute Setup in Cloudflare Dashboard (No Terminal Needed)

### Step 1: Create the Cloudflare Worker
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left sidebar, click **Workers & Pages** → **Create application** → **Create Worker**.
3. Name your worker: `supabase-cinema-proxy` and click **Deploy**.

### Step 2: Paste the Proxy Code
1. On your newly created worker page, click **Edit Code**.
2. Replace all the existing code with the contents of [`cloudflare/worker.js`](./worker.js).
3. Click **Deploy**.

### Step 3: Add a Custom Domain (CRITICAL STEP)
1. In your worker dashboard, go to the **Settings** tab → **Domains & Routes** (or **Triggers**).
2. Click **Add** → **Custom Domain**.
3. Type: `api.cinemamv.online` and click **Add Custom Domain**.
4. Cloudflare will automatically intercept `api.cinemamv.online` and route all requests through this Worker with full CORS headers.

> [!WARNING]
> If you skip adding `api.cinemamv.online` under Custom Domains in the Worker settings, DNS will route `api.cinemamv.online` to Vercel (due to your wildcard `*.cinemamv.online` record). Vercel does not support Supabase REST API requests, leading to CORS errors and 0 requests in your Cloudflare metrics!

---

## Why were Cloudflare Worker metrics showing 0?
Because `api.cinemamv.online` was resolving to Vercel's IP address (`64.29.17.65` / `216.198.79.65`) instead of Cloudflare Workers.
When you attach `api.cinemamv.online` as a **Custom Domain** directly in the Worker's **Settings → Domains & Routes**, Cloudflare overrides DNS to ensure traffic hits your Worker, causing Cloudflare metrics to rise and all CORS errors to disappear.

---

## Alternative: Deploy with Wrangler CLI
If you prefer deploying from your terminal:
```bash
cd cloudflare
npx wrangler deploy
```

