# Fibre Admin Dashboard

`admin.insidefibre.com` is Fibre's authenticated operator surface. The first production view is `/activity`, a read-only interface over the shared structured Activity Log.

The dashboard is deliberately not a semantic authority. Activity remains non-authoritative and fail-open; World and service records decide Fibre truth. The browser never receives a Fibre private/admin token and the Worker exposes no mutation path.

Access is enforced with Cloudflare Access. The Worker validates the Access JWT before serving application assets or `/api/*`; `/healthz` is the only unauthenticated route and exposes only the dashboard service/version identity.

Production and staging hostnames are:

```text
admin.insidefibre.com
admin.staging.insidefibre.com
```

The existing `apps/thread-editor` remains a separate loopback-only M1 inspection/simulation tool. Its deterministic presentation helpers may later inform a production Thread Inspector inside Admin, but its local credential model and simulation boundary are not promoted into this application.
