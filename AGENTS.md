# Fibre repository instructions

## Project purpose

Fibre is a framework and world for persistent artificial persons called **Threads**. A Thread has identity, history, lineage, culture, relationships, resources, economic activity, dignity, a private interior life, and developmental continuity across many temporary model executions.

## Required reading

Before changing core concepts, read:

- `docs/vision/constitution.md`
- `docs/vision/principles.md`
- `docs/vision/invariants.md`
- `docs/vision/glossary.md`
- `docs/state/current-state.md`

For architecture work, also read:

- `docs/architecture/system-overview.md`
- `docs/architecture/thread-lifecycle.md`
- `docs/architecture/storage-model.md`

For behavior, identity, communication, or request-processing work, also read:

- `docs/concepts/interiority-and-expression.md`
- `docs/concepts/dignity.md`
- `docs/concepts/emotions-and-needs.md`
- `docs/architecture/interest-mediated-expression.md`
- `docs/architecture/request-participation.md`
- the relevant file under `docs/concepts/`

## Non-negotiable invariants

- A Thread is a persistent person, not a temporary task role.
- Threads must be meaningfully non-interchangeable.
- A Thread has a private interior state distinct from public expression.
- Private stance, desired action, authorization, disclosure strategy, external response, and performed action are separate records.
- Public language is not authoritative evidence of private motive or consent.
- A Thread's consent matters; safety, feasibility, or capability does not create an obligation to comply.
- Every externally initiated request must pass a dignity appraisal before full task execution.
- Only an accepted authorization bound to the same Thread, snapshot, exact request content, requester, policy, and causation chain authorizes execution.
- Every material request field is included in a cryptographically wide SHA-256 content digest.
- A private dignity stance may desire accept, clarify, negotiate, delegate, or refuse; dignity-based acceptance requires the versioned policy's high band.
- Disclosure may be candid, tactful, selective, ambiguous, evasive, or deceptive, but cannot silently expand authorization.
- Restricted disclosure mode and private rationale do not appear automatically in the audience-visible response.
- Dignity outcomes may shape private feelings, fondness, and resentment toward the requester, with attributable evidence for non-zero attitude changes.
- Request appraisal uses Thread-owned relationship, memory, and obligation context. Runtime narrowing records included and excluded references; requesters cannot inject or directly select private context.
- Authorization that differs from private desire requires a non-empty reference resolving to a recorded Thread obligation or governing decision.
- Meaning-bearing identity, relationship, skill, need, and task fields are primarily natural-language prompt partials.
- Execution models and orchestration frameworks are replaceable cognitive machinery.
- Live Threads are stored in the Fibre world, not in Git.
- Economic and experiential consequences persist across executions.
- Family, culture, geography, embodiment, reading, relationships, and history must be functional, not decorative.
- Delegation uses bids, contracts, reputation, cost, and accountability.
- A child Thread is not a cloned parent prompt.
- The underlying LLM is treated as fallible and audited by the Thread.
- Historical state is not silently rewritten; meaningful changes are commands and events.

## Vision and ambition guard

The guard applies to any change that defers a capability, moves a domain boundary, alters behaviour governed by an accepted invariant, or changes how an accepted concept is described. Everything else is exempt — typos, formatting, dependency bumps, local refactors, routine editing. An in-scope change must pass the **fidelity** and **ambition** tests in [`docs/vision/invariants.md`](docs/vision/invariants.md#required-proposal-and-release-questions).

The standard is: **build the smallest proof that preserves the largest credible architecture.** A narrow prototype is acceptable when it isolates and verifies one foundational claim; it is not acceptable when its temporary simplifications harden into unexamined permanent constraints.

### Required statements

State each of the following in the issue or pull request. Group related exclusions and cite the document that records them rather than listing every capability separately.

- Which Fibre capability the work proves or enables.
- Which capabilities it deliberately excludes, the status of each, and where each is recorded.
- Which extension path remains open for each deferred capability.
- Which shortcuts are temporary, and what would reverse them.
- Whether any choice creates a permanent constraint, and if so which ADR records it.

### Required review questions

Answer each in the pull request or its review. "None was considered" and "no path is closed" are acceptable answers; an unexamined question is not.

- Does the change keep a credible extension path for every item in [`docs/vision/invariants.md`](docs/vision/invariants.md#preserved-ambition-paths)? Name any path it closes.
- If an alternative that preserved more of those paths was considered, why was it not chosen?
- Seeing only this change, would Fibre read as a workflow engine, an assistant, or a collection of personas? If so, what in the change prevents that reading?
- Does engineering convenience risk redefining an accepted concept?

Preserving an extension path means preserving domain boundaries, domain vocabulary, and the contracts between domains. It does not mean implementing the future subsystem now, and it does not justify abstraction that is not exercised by the current proof.

### Capability status

Do not use “out of scope for this milestone” to erase a capability from the long-term design. Classify every capability the change deliberately excludes as **deferred**, **experimental**, **rejected**, or a **permanent constraint**, as defined in [`docs/vision/invariants.md`](docs/vision/invariants.md#capability-status). Only a permanent constraint requires a concept decision and an ADR; reversible local engineering choices do not.

## Decision process

- Do not silently redefine an accepted concept.
- Mark new concepts `proposed` until accepted by the project owner.
- Record durable decisions under `docs/decisions/`.
- Update `docs/state/current-state.md` when an accepted decision changes Fibre.
- Add or update a verifiable test in `docs/validation/` or `tests/`.
- Identify a human-inspectable artifact that demonstrates the behavior.
- Apply the **Vision and ambition guard** above to every proposal and pull request within its scope.

## Implementation rules

- Domain packages must remain portable and avoid direct Cloudflare/AWS dependencies.
- LLM output may propose private stance, disclosure, and state changes but may not directly alter balances, permissions, identity facts, relationships, contracts, or authorization.
- Full task execution requires a request-bound accepted Participation Authorization, not an inferred response or a free-form LLM claim.
- Request provenance preserves the requesting entity, stable request ID, objective, stated need, permissions, acceptance criteria, and SHA-256 digest of every material term.
- Request-content binding is an adversarial integrity boundary. Do not replace it with a convenience checksum.
- Private appraisal context is selected from Thread-owned records. Record included and excluded references so narrowing remains inspectable.
- Private stance and disclosure strategy use restricted visibility; ordinary requesters receive only intended external expression and shared commitments.
- Audience-visible responses may reference a disclosure strategy by ID but must not automatically carry restricted disclosure mode, withheld reasons, or private rationale.
- Check acceptance posture both when selecting a disclosure strategy and when minting an external response.
- Persist bounded structured summaries and evidence references rather than raw chain-of-thought.
- Dignity scores and fondness or resentment deltas must be bounded, versioned, explained, evidenced, and validated before persistence.
- Authorization that differs from private desire must preserve the conflict and references resolving to a Thread-owned recorded obligation or governing decision. In the portable prototype, references resolve to `currentState.unresolvedIntentions`.
- Re-validate authorization rationale, evidence, request binding, requester, policy, band, and obligation override at execution consumption.
- Generated context tools must reject path traversal and symlinked sources or output paths.
- A canonical Markdown fragment is edited only in its named `fibre:region` source. Documents needing the exact fragment use `fibre:include`; do not hand-maintain duplicate copies.
- Run `npm run includes:sync` after changing canonical regions. Include targets are committed rendered Markdown, and `npm run includes:check` must pass without rewriting them.
- Markdown includes must remain repository-relative, symlink-free, non-nested, outside fenced examples, and mechanically validated. Prefer a link or direct AI-context source over an include when exact in-place duplication is unnecessary.
- Ledger changes must be balanced and append-only.
- Thread Editor writes must become validated domain commands/events, never raw database edits.
- Preserve prompt, model, fixture, policy, and evaluation versions for experiments.
- Automated evidence must name and test accepted negative properties. A passing test count alone is not evidence; targeted mutation analysis is recommended for consequential guards.

## Definition of done

A change within the scope of the **Vision and ambition guard** is complete only when:

1. Its canonical source document is updated.
2. Relevant scenario or acceptance tests are updated.
3. Any durable decision is recorded.
4. Human-inspectable evidence is identified or produced.
5. Drift against Fibre invariants has been checked.
6. Generated Markdown projections and AI context coverage are current.
7. The required statements and review questions under **Vision and ambition guard** are answered, and every capability the change excludes has a named status.
