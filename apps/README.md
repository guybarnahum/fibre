# Fibre applications

Human-facing internal and operational applications. Public viewer frontends (such as `insidefibre.com`) deliberately live outside this repository and consume Fibre's public API (`services/thread-presentation/`).

- **[`admin-dashboard/`](admin-dashboard/README.md)** — Authenticated God-view operator dashboard (`admin.insidefibre.com`, Cloudflare Access + D1 entitlements). The sole internal surface that crosses into private World state (genome, Body, Observatory, Birth Center, World Events, Appearance workbench).
- **[`status-page/`](status-page/README.md)** — Public, read-only coarse runtime status (`status.insidefibre.com`): Thread life, Births, and `insidefibre.com`.
- **[`thread-editor/`](thread-editor/README.md)** — Loopback-only local M1 inspection tool (`npm run editor`). Legacy local inspector; not deployed to Cloudflare.
