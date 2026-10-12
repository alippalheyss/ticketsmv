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

### Step 3: Add a Custom Domain (or Route)
1. In your worker dashboard, go to the **Settings** tab → **Triggers** (or **Domains & Routes**).
2. Click **Add Custom Domain** (e.g. `api.cinemamv.online`).
3. Cloudflare will automatically configure the DNS record and SSL certificate within seconds!

### Step 4: Configure the App
In your deployment environment or `.env` file, set:
```env
VITE_SUPABASE_PROXY_URL=https://api.cinemamv.online
```
*(If left unset, the app will continue talking directly to Supabase as normal).*

---

## Alternative: Deploy with Wrangler CLI
If you prefer deploying from your terminal:
```bash
cd cloudflare
npx wrangler deploy
```
