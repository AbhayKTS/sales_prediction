Cloudflare deployment notes
==========================

This folder contains a small Cloudflare Worker that proxies requests from the Pages site to your FastAPI backend and a `wrangler.toml` with a template environment variable.

What the proxy does
- Proxies requests whose path begins with `/api/` or `/predict` to the backend set in `BACKEND_URL`.
- Adds permissive CORS response headers (useful for Pages during testing).

Quick steps — publish the Worker (workers.dev)
1. Install Wrangler (Cloudflare CLI):

```powershell
npm install -g wrangler
```

2. Log in:

```powershell
wran gler login
# or
wrangler login
```

3. Edit `wrangler.toml` and set `BACKEND_URL` under `[env.production]` (or set a default above the env section).

4. Publish to a workers.dev subdomain (no account_id required):

```powershell
wrangler publish
```

This will publish the worker and give you a workers.dev URL. If you'd like the Worker to run on the same domain as your Pages site (so you can call `/api/...` without an external domain), you'll need to set `account_id` in `wrangler.toml` and create a route in Cloudflare that points your Pages domain to the Worker. To do that you'll need your Cloudflare account id and to set `workers_dev = false`.

Deploy frontend to Cloudflare Pages
1. In your Cloudflare dashboard, go to Pages → Create a project → Connect to your GitHub repo (AbhayKTS/sales_prediction) and select the `main` branch.
2. Set the build command and output directory:

Build command: cd campaign-sales-bot && npm ci && npm run build
Build output directory: campaign-sales-bot/dist

3. If your backend is available at a public URL (not proxied), set an environment variable in Pages for `API_BASE` to that URL. If you use the Worker proxy, you can keep calls relative (e.g. `/predict/...`) and map the Worker to your Pages domain.

Notes & tips
- For local testing you can publish the Worker to workers.dev and call the Pages deployment with the worker's script route, or run the frontend locally and point `API_BASE` at your locally-running server.
- Tighten CORS in the Worker before production: replace `*` with your Pages domain and remove permissive credentials if not needed.
- If you want, I can add a GitHub Actions file to build and publish to Pages or automate Worker publishes via CI. Tell me if you'd like that.
