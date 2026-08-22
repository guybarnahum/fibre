# Fibre repository instructions

## Project purpose

Fibre is a framework and world for persistent artificial persons called **Threads**. A Thread has identity, history, lineage, culture, relationships, resources, economic activity, dignity, a private interior life, and developmental continuity across many temporary model executions.

## Required reading

Before changing core concepts, read:

- `docs/foundations/constitution.md`
- `docs/foundations/principles.md`
- `docs/foundations/invariants.md`
- `docs/glossary.md`
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

For public progress, milestone summaries, website status, or claims about what Fibre can do, also read:

- `docs/state/public-progress.md`
- `docs/state/public-progress.json`

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
- Private context-selection authority is part of Thread agency. Standing causal-individuality proofs may not substitute caller-authored private subsets for Fibre/Thread-owned attention and retrieval.
- Authorization that differs from private desire requires a non-empty reference resolving to a recorded Thread obligation or governing decision.
- Meaning-bearing identity, relationship, skill, need, and task fields are primarily natural-language prompt partials.
- **A derived category is never a safe stand-in for the semantic meaning it compresses.** Fibre may derive labels, enums, scores, ranks, or other categories for inspection, indexing, control, or ablation, but the underlying meaning-bearing content must remain separately addressable and authoritative.
- Execution models and orchestration frameworks are replaceable cognitive machinery.
- Live Threads are stored in the Fibre world, not in Git.
- Economic and experiential consequences persist across executions.
- Family, culture, geography, embodiment, reading, relationships, and history must be functional, not decorative.
- Delegation uses bids, contracts, reputation, cost, and accountability.
- A child Thread is not a cloned parent prompt.
- The underlying LLM is treated as fallible and audited by the Thread.
- Historical state is not silently rewritten; meaningful changes are commands and events.

## Vision and ambition guard

The guard applies to any change that defers a capability, moves a domain boundary, alters behaviour governed by an accepted invariant, or changes how an accepted concept is described. Everything else is exempt — typos, formatting, dependency bumps, local refactors, routine editing. An in-scope change must pass the **fidelity** and **ambition** tests in [`docs/foundations/invariants.md`](docs/foundations/invariants.md#required-proposal-and-release-questions).

The standard is: **build the smallest proof that preserves the largest credible architecture.** A narrow prototype is acceptable when it isolates and verifies one foundational claim; it is not acceptable when its temporary simplifications harden into unexamined permanent constraints.

### Default meaning of adversarial review

Unless a review is explicitly scoped as a **security**, **threat-model**, **abuse**, or **red-team** review, an **adversarial review of Fibre means a vision-effectiveness review**.

The reviewer should try to falsify the claim that the implementation is making Fibre more like a world of persistent artificial persons. Security robustness is one useful dimension, but it is not the default or dominant lens. The primary questions are whether identity, history, dignity, relationships, obligations, development, and economic consequences are becoming **causal and load-bearing**, or merely more richly represented, stored, hashed, prompted, and displayed.

A vision-effectiveness review should actively look for these failure modes:

- personhood concepts are present as records or labels but no code path lets them change a decision or future possibility;
- a caller, fixture, or test authors the Thread's apparent inner life and the kernel only validates it;
- a caller or fixture chooses private context so a later Fibre-owned policy merely computes over an externally engineered attention set;
- two materially different Threads receive different context but still have no mechanism that can make them choose differently;
- history is persisted but does not bend later appraisal, authority, behavior, relationship state, opportunity, or resources;
- opaque references reach a capsule and are described as though the referenced identity/history content reached cognition;
- new identity fields have provenance and UI but no named behavioral consumer;
- a milestone can pass while Fibre would behave the same if the distinctive Thread fields were deleted or replaced by persona text.

The standing differential contract is [`docs/validation/thread-differential-gate.md`](docs/validation/thread-differential-gate.md). Once implemented, it is a release-level ambition gate: same external request, materially different Thread-owned identity/history, Fibre/Thread-owned private context selection/retrieval, Fibre-owned stance production, and an attributable behavioral divergence.

### Required statements

State each of the following in the issue or pull request. Group related exclusions and cite the document that records them rather than listing every capability separately.

- Which Fibre capability the work proves or enables.
- Which capabilities it deliberately excludes, the status of each, and where each is recorded.
- Which extension path remains open for each deferred capability.
- Which shortcuts are temporary, and what would reverse them.
- Whether any choice creates a permanent constraint, and if so which ADR records it.
- For each new identity, history, relationship, dignity, developmental, or economic field: what consumes it, and what behavior or future possibility can it change? If the answer is “not yet,” name that explicitly as deferred rather than counting the field as functional evidence.

### Required review questions

Answer each in the pull request or its review. "None was considered" and "no path is closed" are acceptable answers; an unexamined question is not.

- Does the change keep a credible extension path for every item in [`docs/foundations/invariants.md`](docs/foundations/invariants.md#preserved-ambition-paths)? Name any path it closes.
- If an alternative that preserved more of those paths was considered, why was it not chosen?
- Seeing only this change, would Fibre read as a workflow engine, an assistant, or a collection of personas? If so, what in the change prevents that reading?
- Does engineering convenience risk redefining an accepted concept?
- **Causal individuality:** what Thread-owned difference can make a different decision, participation stance, relationship consequence, action, or later opportunity because of this change? Is that causal path actually exercised, or only stored/compiled/displayed?
- **Endogenous attention:** who chooses which private memory, relationship, obligation, or other historical context matters? If a caller chooses the subset and Fibre only verifies ownership, is the change honestly described as scaffolding rather than Thread-owned attention/retrieval?
- **Endogenous agency:** who authors the consequential judgment? If the caller provides the score, desired action, feelings, factors, or outcome and Fibre only validates them, is the change honestly described as infrastructure for future agency rather than evidence of agency itself?
- **History bending the future:** which persisted fact from an earlier episode can alter a later choice or possibility? If only an opaque reference reappears, has the referenced content actually been resolved and consumed? If none, does the milestone overclaim development or continuity?
- **Differential evidence:** where identity is supposed to matter, can the same request to two materially different Threads produce a required, attributable difference in stance and downstream behavior under the same declared Fibre/Thread-owned selection policy? Different prompt/capsule contents alone do not satisfy this question.

Preserving an extension path means preserving domain boundaries, domain vocabulary, and the contracts between domains. It does not mean implementing the future subsystem now, and it does not justify abstraction that is not exercised by the current proof.

### Classifying a vision-effectiveness finding

When a review finds a gap between what the implementation represents and what it makes consequential, classify the gap with this vocabulary rather than borrowing security severities:

- **Inert** — a personhood-bearing field or mechanism is stored, validated, or displayed but has no downstream consumer that changes context, judgment, behavior, resources, relationships, or future possibility. Acceptable when explicitly named as deferred; reportable whenever it is presented as progress toward functionality.
- **Context-only** — a Thread-owned difference changes a prompt, capsule, selected evidence, or other cognition input, but no acceptance criterion requires it to change a judgment or downstream consequence. This is meaningful wiring, but it does **not** satisfy causal individuality or the standing differential gate.
- **Exogenous** — a consequential judgment, attention/selection decision, or other personhood-bearing value attributed to the Thread is authored by a caller, fixture, or external test input and Fibre only validates or records it. Legitimate scaffolding, but it blocks any claim that the Thread itself produced that judgment or attention decision.
- **Decorative** — wording, UI, policy names, or milestone summaries make an Inert, Context-only, or Exogenous mechanism look behaviorally functional. Correct the claim or implement the missing consequence; a Decorative finding against a central acceptance claim blocks that claim.
- **Notarial** — integrity, provenance, append-only storage, or inspection is added around a mechanism. This can be important foundational work, but it is evidence for persistence/governance of that mechanism, not by itself evidence that identity or history changes behavior.
- **Narrowing** — a design makes a preserved ambition path materially harder to reach, or makes the easiest next step continue adding representation rather than consequence. Redesign it or record an explicit owner decision.
- **Contradiction** — the change conflicts with the Constitution, the Thirteen Principles, or an accepted invariant. Blocking.

The review vocabulary above classifies **findings**; a milestone causal-status register classifies **mechanism maturity** as Named-only, Stored-only, Context-only, or Behaviorally/future-state causal. `Context-only` intentionally has the same meaning in both. An Inert finding usually points to a Named-only or Stored-only mechanism; Exogenous is an orthogonal authorship/selection axis that can apply at any maturity level. Do not collapse the two vocabularies into competing ladders.

Inert, Context-only, Exogenous, and Notarial states can be intentional milestone scaffolding when they are named honestly. They become defects in the milestone claim when they are counted as evidence for a stronger capability than they actually provide.

### Capability status

Do not use “out of scope for this milestone” to erase a capability from the long-term design. Classify every capability the change deliberately excludes as **deferred**, **experimental**, **rejected**, or a **permanent constraint**, as defined in [`docs/foundations/invariants.md`](docs/foundations/invariants.md#capability-status). Only a permanent constraint requires a concept decision and an ADR; reversible local engineering choices do not.

## Public progress language

`docs/state/public-progress.json` is the canonical machine-readable statement of what Fibre has and has not achieved. `docs/state/public-progress.md` is its human-readable companion. Public renderers such as `insidefibre.com` consume this truth; they do not independently upgrade claims.

Every public progress claim must have two layers:

1. **Simple English first.** Write for a teenager with no Fibre background. Avoid unexplained milestone, gate, schema, runtime, and implementation jargon.
2. **More accurate description second.** State the precise Fibre mechanism, validation boundary, and the strongest important limitation.

Rules:

- Simplification may remove jargon, but it may not remove uncertainty or make a claim stronger.
- Every positive capability claim states an important limitation in both layers.
- Prefer simple public labels such as **Done**, **Shown working**, **Working on it**, **Not yet**, and **Experiment failed — kept as evidence**; keep the stable internal status IDs for machines and precise reporting.
- Never use “living Thread” as a synonym for generated artifact. Distinguish candidate, generated, atomically published, and validated state.
- Never say a Thread “has parents” without distinguishing live Thread parents, household caregivers, and synthetic genetic ancestors.
- Failed experiments remain visible. Do not rewrite a failed bounded run into progress language that implies success.
- When a milestone boundary materially changes what Fibre can truthfully claim, update `public-progress.json` and its Markdown companion as part of recording that boundary.
- The public-progress contract is currently one evolving canonical contract. Do not create compatibility versions until a real external consumer requires a frozen historical shape.

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
- Private appraisal context is selected only from Thread-owned records. Record included and excluded references so narrowing remains inspectable. For standing causal-individuality evidence, selection/retrieval authority must itself be Fibre/Thread-owned or use the same declared default policy for both Threads; caller-supplied private subsets are provisional scaffolding, not evidence of Thread agency.
- Do not treat an opaque record reference as evidence that the referenced content reached cognition. Where history or identity content is claimed as causal, resolve and inspect the bounded content that the consumer actually received.
- **Do not expose a Fibre-derived verdict as though it were evidence semantics.** Types and provenance may be model-visible; derived conclusions such as effect labels, relevance ranks, confidence/strength flags, or compressed categories must not override or replace the separately addressable semantic evidence from which they were derived. If a downstream contract genuinely needs a derived measurement as independent evidence, name and justify that role explicitly.
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
- Automated evidence must name and test accepted negative properties. For authority-, consent-, obligation-, identity-, ledger-, and lifecycle-critical guards, evidence must pin both the guard's behavior and the live call path or transaction boundary that makes it load-bearing; a removable wiring point is not sufficient evidence. A passing test count alone is not evidence; targeted mutation analysis is recommended for consequential guards.
- For identity-, dignity-, relationship-, history-, development-, or economy-facing work, do not count persistence, schema validation, prompt inclusion, provenance, or UI display alone as proof that the concept is functional. Name and exercise the downstream consequence, or state explicitly that causal behavior remains deferred.

## Definition of done

A change within the scope of the **Vision and ambition guard** is complete only when:

1. Its canonical source document is updated.
2. Relevant scenario or acceptance tests are updated.
3. Any durable decision is recorded.
4. Human-inspectable evidence is identified or produced.
5. Drift against Fibre invariants has been checked.
6. Generated Markdown projections and AI context coverage are current.
7. The required statements and review questions under **Vision and ambition guard** are answered, and every capability the change excludes has a named status.
8. If the change claims that a Thread difference is functional, the evidence identifies the causal Thread-owned input and the resulting behavioral or future-state consequence; prompt/context difference alone is insufficient.

Closing a milestone additionally requires both of the following so representation is never mistaken for capability:

1. A **causal-status register** in the milestone contract covering each personhood-bearing field family or named mechanism the milestone introduces or relies on. Classify each as **Named-only**, **Stored-only**, **Context-only**, or **Behaviorally/future-state causal**; distinguish opaque references from the content they name; state who authors consequential values and private selection/retrieval where authorship matters; name the current consequence; and name the next proof required to advance it. Technical IDs, timestamps, and integrity metadata do not need field-by-field entries.
2. A **recorded score** under `## Recorded scores` in [`docs/validation/drift-scorecard.md`](docs/validation/drift-scorecard.md), with a concise evidence basis for every dimension and the rubric version used. A score below the threshold is acceptable for a deliberately foundational milestone after explicit drift review; an absent score is not.
