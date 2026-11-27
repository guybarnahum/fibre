# Fibre tools

`tools/` holds operational, deployment, model-certification, inspection, and repository-validation CLIs. Durable runtime authority belongs under `services/`; tools operate, inspect, or validate that runtime without becoming a second semantic authority.

## Layout

| Directory | Responsibility |
|---|---|
| `deployment/` | Cloudflare provisioning, D1 migrations, secrets, service/app deploy, cloud E2E, plus standalone recovery CLIs (`repair-thread.mjs`, `recover-thread-visual.mjs`, `reset-cloudflare-activity.mjs`) |
| `model/` | OpenAI usage (`model:usage`), staging captures (`model:captures`), blind quality judging (`model:quality`), replay (`model:replay`), a changed World-event prompt asked again over recorded occasions before deploying it (`world:happening-replay`), cost/certification options (`model:options`), smoke checks (`model:smoke`) |
| `ops/` | Live World operations: Durable Object read/write telemetry (`infra:state-usage`, `infra:measure`, `cloudflare-resource-watch.mjs`), rest/wake (`world-life:rest`/`wake`), waves (`world-life:wave`), urge expression (`world-genome:express`), social scorecard (`world-social:quality`), observatory (`world-observatory`), integrity audit (`world:integrity-audit`), and `configure-admin-thread-repair.mjs` |
| `dry-run/` | Dry runs of proposed Body mechanisms with living Threads' genes, before they are built (`dry-run:thematic-spreading`); method in `docs/validation/mechanism-dry-run.md` |
| `repository/` | Repo integrity, Markdown includes, prompt sync, AI context packs, dependency/persistence/naming policies, `validate-project-artifacts.mjs` |
| `test-infra/` | Active/replay/all test discovery (`test-suite-lifecycle.mjs`) and compact reporters (`fibre-spec-reporter.mjs`) |
| `genesis/`, `appearance/`, `fid/`, `migrations/`, `world/`, `meet/`, `inside-fibre/`, `population-lab/`, `presentation/`, `providers/`, `inspect/`, `validation/` | Domain-specific operator CLIs and live probes |
| `editor/` & `replays/m1/` | Loopback local Thread Editor server and retained M1 deterministic replay proof |
| `shared/` | Cross-tool helpers (`#repo-root`, local world state, progress heartbeat) |

## Cross-tree imports

Tools import sibling trees via root `package.json` subpath aliases (`#services/*`, `#core/*`, `#apps/*`, `#infra`, `#integrations/*`, `#fixtures/*`, `#tools/*`, `#repo-root`) instead of deep relative paths. `tools/test-infra/repository-import-map.test.mjs` enforces that every alias resolves and no relocation symlinks exist.

## Validation

Use focused tests during development (`npm run test:focused -- <path>`) and **`npm run slice:validate`** once at slice completion.
