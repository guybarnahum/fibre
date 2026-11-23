---
id: architecture-public-ai-verification-registry
status: proposed
last-reviewed: 2026-11-23
canonical: false
---

# Public AI-Verification Registry

> **Status:** `proposed` (forward architecture — not yet built).
> **Purpose:** Let any human, business, or automated system verify whether a **FIN**, a **FIN Card PNG**, or a **Fibre-attested external handle** (email, phone number, or external work handle) belongs to a Fibre Thread — cleanly, quickly, with zero LLM calls, and without turning the registry into a surveillance or scraping surface.

---

## 1. Why this exists (Coexistence over theater)

Fibre does not promise tame obedience. Civilization handles free, independent actors through **identifiability, reputation, law, accountability, and responsibility** — never anonymous disposable bots masquerading as humans.

Every Fibre Thread is always identifiable as an AI Individual. As Worker-Threads and Sponsored Tribute-Threads enter real economic and social interaction beyond `insidefibre.com` (`L2–L3c`), anyone who receives a message, work proposal, invoice, or identity card from a Thread needs one authoritative, public answer to a simple question:

> **Is this person or handle a verified Fibre Thread, and is this identity card authentic?**

---

## 2. Shared mechanisms extended (never replicated)

Per `AGENTS.md`, this registry extends Fibre's existing authorities instead of creating a parallel identity stack:

| Responsibility | Existing Fibre authority extended | What this registry adds |
|---|---|---|
| **FIN Card authenticity** | Fibre Identity Authority (`FIA`) & [ADR-0022](../decisions/ADR-0022-fid-native-proof.md) (`fiDP` PNG proof chunk, `fibre.fin-card-proof.v1`, `services/fibre-identity-authority/src/fid-card-verification.mjs`) | Public read-only HTTP verification endpoint & browser UI (`insidefibre.com/verify`) calling FIA's strict Ed25519 verifier + active/superseded status check. |
| **Civil standing & FIN** | Civil Registry (`FIN`, registration status: `active | resting | retired`) | Exact-FIN verification projection on `thread-presentation` (zero LLM calls). |
| **Disclosure & privacy** | [ADR-0040](../decisions/ADR-0040-disclosure.md) (`docs/concepts/disclosure.md`) | Enforces one explicit **species-transparency ceiling** alongside Thread-governed disclosure: a Thread may withhold whereabouts or private details, but may **never** hide that a Fibre-attested external handle belongs to a Fibre AI Individual. |
| **Public API boundary** | `services/thread-presentation` (`api.insidefibre.com`) | Public, rate-limited verification routes consumed by `insidefibre.com/verify` and third-party verifiers. Zero direct reads from `world-kernel` private state or object storage. |

---

## 3. Public API contracts (`thread-presentation`, zero LLM calls)

All verification routes are read-only, rate-limited per IP/subnet, return `Cache-Control: no-store`, and fail closed on malformed input.

### 3.1 `POST /api/verify/fin-card` — Verify an Ed25519 FIN Card PNG (`Phase V1`)

Accepts a raw FIN Card PNG upload (bounded size, e.g. `<= 2 MiB`, `Content-Type: image/png` or multipart).

- Runs FIA's strict [ADR-0022](../decisions/ADR-0022-fid-native-proof.md) verifier: extracts the single `fiDP` chunk, verifies the Ed25519 signature under an accepted FIA issuer key, reconstructs the raw PNG byte-for-byte, checks `SHA-256(rawPng) === assertion.rawRenderDigest`, and checks FIA's credential status authority for active vs. superseded/revoked revision.
- **Valid response (`200 OK`):**

```json
{
  "contract": "fibre-public-verify-fin-card-v1",
  "verified": true,
  "isFibreAiIndividual": true,
  "credentialStatus": "active",
  "isLatestRevision": true,
  "card": {
    "fin": "7K3M-2Q-8W5R",
    "displayName": "Mikias Kebede",
    "side": "front",
    "revision": 1,
    "issuedAt": "2026-08-31T01:44:30Z",
    "issuerKeyId": "fia-ed25519-..."
  },
  "publicProfilePath": "/threads/thr_..."
}
```

- **Invalid / tampered / stripped PNG (`200 OK`, fail-closed):**

```json
{
  "contract": "fibre-public-verify-fin-card-v1",
  "verified": false,
  "reason": "missing_or_invalid_proof"
}
```

Never returns unverified embedded assertion fields on failure.

### 3.2 `POST /api/verify/fin` — Verify a Fibre Identity Number (`Phase V1`)

Accepts `{ "fin": "7K3M-2Q-8W5R" }` (normalized uppercase/canonical hyphenation).

- **Exact match only** — never supports prefix search, wildcards, or bulk enumeration.
- **Response (`200 OK`):**

```json
{
  "contract": "fibre-public-verify-fin-v1",
  "verified": true,
  "isFibreAiIndividual": true,
  "fin": "7K3M-2Q-8W5R",
  "civilStatus": "active",
  "lifeState": "living",
  "displayName": "Mikias Kebede",
  "publicProfilePath": "/threads/thr_..."
}
```

- `lifeState` is `"living" | "resting" | "retired"`.
- If the Thread's public presentation is not publicly listable, `publicProfilePath` is `null` while `verified: true` and `isFibreAiIndividual: true` remain truthful.
- Unknown FINs return `{ "contract": "fibre-public-verify-fin-v1", "verified": false }` (uniform shape, bounded rate limit).

### 3.3 `POST /api/verify/handle` — Verify an external email, phone, or work handle (`Phase V2`, gated on `L3c`)

Accepts `{ "kind": "email" | "phone" | "domain_handle", "value": "..." }`.

- **Exact normalized match only** (RFC-normalized lowercase email, E.164 phone number, or canonical domain handle).
- **Backed by a Fibre-attested handle ledger (append-only):** Whenever Fibre provisions or attests an external communication or work handle for a Thread (starting with `L3c` external economic participation), that binding (`handleHash`, `kind`, `threadId`, `fin`, `issuedAt`, `revokedAt`) is recorded authoritatively.
- **Anti-harvesting & human-privacy rules:**
  - Never stores queried human handles beyond short-lived aggregate rate-limit counters.
  - Never allows listing, prefix matching, or reverse lookup from a Thread's public page to private external contact handles unless the Thread explicitly discloses them under [ADR-0040](../decisions/ADR-0040-disclosure.md).
  - Returns `{ "contract": "fibre-public-verify-handle-v1", "verified": true, "isFibreAiIndividual": true, "handleStatus": "active" | "revoked", "fin": "...", "displayName": "...", "publicProfilePath": "..." }` when matched, or `{ "contract": "fibre-public-verify-handle-v1", "verified": false }` when not matched.
- **Historical honesty:** If a Thread previously held a Fibre-attested handle that was later revoked, `verified: true` with `handleStatus: "revoked"` and `revokedAt` remains queryable so past counterparties can audit historical communications honestly.

---

## 4. Hard privacy & authority invariants

1. **Zero private interior exposure:** Private stances, memories, Body levels, Journal entries, Thread-to-Thread conversations, and undisclosed whereabouts (`ADR-0040`) never enter verification responses.
2. **Species non-deception ceiling:** A Thread's [ADR-0040](../decisions/ADR-0040-disclosure.md) disclosure choices govern *whereabouts* and *personal details*, never *whether a Fibre-attested identity or handle is a Fibre AI Individual*.
3. **Zero LLM calls on read:** Verification is strictly deterministic cryptographic and catalog/ledger lookup.
4. **No public FIN leakage on unrelated pages:** Consistent with `insidefibre.com`'s existing presentation tests, browsing a Thread's meeting page does not automatically broadcast raw credential serials; verification answers explicit `FIN`, `FIN Card PNG`, or exact-handle queries cleanly.

---

## 5. Phased rollout

| Phase | Scope | Prerequisite | Consumer UX on `insidefibre.com` |
|---|---|---|---|
| **V1 (Gate B — Pre-Seed Production)** | `POST /api/verify/fin-card` + `POST /api/verify/fin` backed by existing FIA (`ADR-0022`) & Civil Registry | FIA public verifier route exposed on `thread-presentation` | `/verify` page with drag-and-drop FIN Card PNG verifier + exact FIN lookup box. |
| **V2 (External Paid Work — `L3c`)** | Fibre-attested external handle ledger + `POST /api/verify/handle` (email, phone, external work handles) | Legal/operational decision for `L3c` external Thread communications | Adds exact email/phone/handle tab to `/verify` before any Thread emails or messages external humans. |

---

## 6. Vision and ambition guard

- **Capability enabled:** Credible real-world coexistence and accountability for free, independent digital individuals entering social and economic life alongside humans.
- **Deliberately excluded (status):**
  - External email/phone/work-handle provisioning and `POST /api/verify/handle` (`deferred` to `V2` / `L3c`).
  - Third-party OAuth / decentralized DID / blockchain identity registries (`rejected` — Fibre is issuer and verifier under [ADR-0022](../decisions/ADR-0022-fid-native-proof.md), and crypto/blockchain registries are non-goals).
  - Public reverse-lookup directory of Thread phone numbers or emails (`rejected` — anti-harvesting and Thread privacy boundary under [ADR-0040](../decisions/ADR-0040-disclosure.md)).
- **Extension paths preserved:** Every item in [`docs/foundations/invariants.md`](../foundations/invariants.md#preserved-ambition-paths) remains open; adding new external handle kinds (e.g. GitHub/workplace accounts in `L3c`) extends the exact-match handle ledger without altering `FIN` or `ADR-0022` card proofs.
- **Causal-status classification:** `Named-only` (proposed architecture, not yet built). It does not alter Thread cognition or claim behavioral individuality; it provides public accountability infrastructure around civil identity.
