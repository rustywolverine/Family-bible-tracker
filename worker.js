// API routes are handled by the Worker; all other requests serve the existing site.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/status") {
      return Response.json({
        service: "family-bible-tracker",
        api: "ready",
        database: env.DB ? "bound" : "not-bound"
      }, { headers: { "Cache-Control": "no-store" } });
    }
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  }
};
