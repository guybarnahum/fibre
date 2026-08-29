# Service runtime

Shared operational HTTP plumbing for Fibre services.

It owns only reusable mechanics:

- public `GET /healthz`;
- exact HTTP route dispatch;
- Bearer-token authentication for protected routes;
- standard JSON error responses;
- runtime-neutral Fetch `Request` / `Response` handling.

It does not own Fibre service semantics, provider selection, generated-media policy, C2PA trust policy, Thread authority, or publication decisions.

Cloudflare Workers can call the Fetch runtime directly. Node-hosted services use `infra/local/node-service-runtime.mjs` to adapt Node HTTP requests to the same runtime.

A service that exposes a paid or privileged operation should keep that route explicit and protected. Health checks remain side-effect free and must not call paid providers or external trust services.
