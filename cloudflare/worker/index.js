// Simple Cloudflare Worker proxy to forward /api or /predict requests to your backend.
// Configure BACKEND_URL via wrangler.toml or via the Cloudflare dashboard (variable name: BACKEND_URL).

addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const url = new URL(request.url);

  // Only proxy API/predict paths, let Pages or static assets be served normally
  if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/predict")) {
    return fetch(request);
  }

  const backend = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : null;
  if (!backend) {
    return new Response(JSON.stringify({ error: 'BACKEND_URL not configured on the Worker.' }), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8' },
    });
  }

  // Construct target URL: append original path + query string to the backend base
  const target = backend.replace(/\/$/, '') + url.pathname + url.search;

  // Forward the incoming request to the backend
  const init = {
    method: request.method,
    headers: request.headers,
    // Body is a ReadableStream for non-GET requests; forward as-is
    body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
    redirect: 'manual',
  };

  const resp = await fetch(target, init);

  // Copy response headers and set permissive CORS so the Pages site can call /api without issues.
  const responseHeaders = new Headers(resp.headers);
  // Allow Pages origin or '*' during testing. Consider tightening for production.
  responseHeaders.set('access-control-allow-origin', '*');
  responseHeaders.set('access-control-allow-credentials', 'true');

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: responseHeaders,
  });
}
