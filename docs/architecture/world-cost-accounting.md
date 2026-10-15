---
id: architecture-world-cost-accounting
status: proposed
last-reviewed: 2026-10-08
canonical: true
---

# World cost accounting and visibility — proposed plan

## Purpose

Know what it actually costs for Fibre's Threads to **live**, not merely what it costs to serve a request. The unit of value is an admitted World transition, plan renewal, genuine opportunity, individually noticed Experience, or consequential continuation. Quiet World time must be counted without paying to simulate it.

This is **operational cost reflection**, not a new Thread economic decision authority, Fibre Credit charge, billing subsystem, or cognition input. It advances Constitution Article V (real external cost and model-token consumption) while preserving the distinction between external provider expenditure and a Thread's own resources.

## Existing evidence and unknowns

- The Cloudflare World Kernel currently has one provider-neutral World reconciliation alarm, indexed next-life and environmental due work, and per-operation `world-state-cost` counters for SQL queries/rows read/rows written.
- The OpenAI reasoning adapter already reports `usage.inputTokens`, `usage.outputTokens`, request attempts and model provenance. These fields are useful inputs, **not yet an end-to-end cost report**.
- Exact provider bills, token mix by World operation, average model latency, billed Durable Object duration, cache/failed-call charges, and wake frequency have **not** been established from a real sustained population run.
- Previous discussion used a *scenario*, not observed spending: roughly **$3–$15 per active Thread-month**, with a central modeled **$5–$8** routine inference budget. The illustrative $7.56/Thread-month case assumed four daily planning calls (including possible redundant renewal), four environmental considerations, two regulation interpretations and half an attention+consolidation episode; it excludes births, media, visitor conversations and significant external activity. Price assumptions must be refreshed at measurement time. Do **not** treat these values as deployed cost evidence or a pricing commitment.

## October 14–15 staging evidence and corrective design

Two repeated single-Thread Observatory inspections measured the same steady-state
**11,541 Durable Objects SQL rows read, 199 queries, zero writes**. One earlier
request measured 14,837 rows, 232 queries and two writes. The steady-state
largest store labels were LivedNow 4,724 rows; SituatedLife 2,612;
SymbolicGenome 2,579; SemanticState 551; CivilRegistry 514;
LivedExperience 465. These are measured *request* counts, not baseline
idle-Thread usage and not yet a measured post-correction result.

The corrective pass moves Cloudflare World SQL schema installation into an
**explicit deployment operation**. The existing `cloud:deploy:service` command
deploys the World kernel, then invokes a private migration route and requires
a successful installation response. Operational store opens use the installed
schema, not repeated DDL, migration, or SQLite catalog existence checks.
Local development still initializes its own isolated database normally.
Deploy migrations once while quota capacity is available; their one-time
cost must never be confused with routine Thread life.

The operator Thread page initially requests **current life only**.
Memories, social history, genomes, contact activity and detailed
relationships load when the deferred history section becomes visible or
is requested. Individual operations are also being made bounded/indexed:
direct lookup of the enacted Flight Plan, transactional latest-revision
projection for SituatedLife with full immutable histories retained, and
catalog-free reads for installed symbolic-genome/civil-registry/venue tables.

**Acceptance remains open until Guy validates and measures the new deployment.**
Check one current-only Observatory request and one explicitly requested full
inspection, collecting the existing `x-fibre-state-*` cost headers. Do not
infer cloud savings from source code or test success. Do not run population
probes to obtain these two measurements.

## Measurement plan

1. **Reconcile existing evidence before adding instrumentation.** Trace each World wake through the existing activity/usage/cost reporting path. Identify genuinely missing usage counters, not a parallel telemetry platform.
2. **Emit a minimal bounded cost observation per completed operation** from existing boundaries: operation kind, time window, attribution IDs when applicable, admitted outcome, model/provider, input and output tokens, retry count, elapsed/busy duration when measurable, SQL rows/queries and wake count. Optional cache tokens and provider-reported billing fields only when actually available. No new model call, stored prompt, raw private cognition or general-purpose tracing service.
3. **Attribute without double counting:** Thread planning, personal regulation, attention and consolidation belong to a particular Thread; a shared exterior event belongs to the World/place once, while each observer's attention is separately attributed to that Thread. An operation can have both Thread and physical-venue dimensions without its cost being summed twice. An unbound/private place must not be misreported as a physically shared venue. Platform baseline is separate from marginal inference.
4. **Project, don't invent invoices.** Produce an operator-readable, bounded period rollup per active Thread-day, planned stop/renewal, actual situation advance, physical World venue, shared occurrence, observer Experience and successful/already-quiet reconciliation. Distinguish `measured usage`, `estimated cost under dated rates`, and `actual provider-billed cost` (only when independently available). Attribute retries and no-change calls. Display active/quiet Thread counts and outcome denominators, not just average spend among busy Threads.
5. **Calibrate with naturally observed activity:** first the independent E7.5 scheduled advance, then a small bounded ordinary-life/World-event sample; compare event/plan/admission mix and measured per-operation counts with the provisional scenario. Avoid population waking or running model inference just to obtain metrics.

## Acceptance and next decisions

- One read-only cost view reconstructs the actual total from disjoint operation classes and reconciles it to its own observation records; Thread and venue pivots do not multiply shared-event costs.
- It distinguishes a no-model deterministic boundary from a model-backed renewal, a `no_change` environmental consideration, and genuinely noticed consequence; displays token totals, latency, retries and pricing provenance with brief, meaningful gaps where data is absent.
- At least one normal autonomous World day or an equivalent naturally admitted bounded observation supplies a credible cost-per-Thread-day and backlog/latency baseline. **No claim of measured real pricing before this.**

**Timing:** first after the existing E7.5 natural-alarm evidence is captured and before substantial cost/scale refactors. Feed the measurements into [World compute optimization](world-compute-optimization.md) and [World reconciliation scaling](world-reconciliation-scaling.md). This plan is not implementation approval for heavyweight observability or continuous telemetry sampling.
