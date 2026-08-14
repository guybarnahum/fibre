import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openWorldStore } from "../services/world-kernel/src/persistence.mjs";
import {
  identityAssertionId,
  identityClaimId,
} from "../services/world-kernel/src/identity-provenance-domain.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY } from "../services/world-kernel/src/identity-claim-discipline.mjs";
import { identityDomainV2Definition } from "../services/world-kernel/src/identity-domain-registry-v2.mjs";
import {
  openIdentityInspectionStore,
  openIdentityStore,
} from "../services/world-kernel/src/identity-store.mjs";
import { guardianModelAdapterFromEnvironment } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import { runM2IdentityCausalWirePreflight } from "../services/world-kernel/src/m2-identity-causal-wire.mjs";

const fixture = JSON.parse(readFileSync(
  new URL("../fixtures/threads/mina.thread.json", import.meta.url),
  "utf8",
));

function seed(databasePath) {
  const store = openWorldStore(databasePath);
  store.seedThread(structuredClone(fixture));
  store.close();
}

function recordDevelopmentAssertion(databasePath) {
  const identity = openIdentityStore(databasePath);
  const seedEvent = identity.getCurrentIdentityView(fixture.threadId).assertions[0].sourceReferences[0];
  const claimId = identityClaimId({ threadId: fixture.threadId, purpose: "archival-film-restoration-practice" });
  const recordedAt = "2026-08-14T20:30:00Z";
  const meaning = "I have spent years restoring damaged 16mm family film reels by hand, including archival splicing and careful handling of fragile original film.";
  const assertion = {
    assertionId: identityAssertionId({ claimId, revision: 1, meaning, recordedAt }),
    claimId,
    revision: 1,
    threadId: fixture.threadId,
    domain: "artistic_formation",
    kind: "craft_orientation",
    claimPredicate: { subject: "self", predicate: "practices", object: "archival_16mm_film_restoration" },
    meaning,
    provenanceClass: "historical_experienced",
    authorship: { kind: "fibre_policy_derived", entityId: "fibre.world-kernel" },
    sourceReferences: [seedEvent],
    effectiveAt: recordedAt,
    recordedAt,
    visibility: "private",
    status: "current",
    projectionClass: identityDomainV2Definition("artistic_formation").projectionSection,
    behavioralStatus: "candidate_causal",
    admission: {
      policy: { id: "identity_world_admission", version: "1" },
      claimDiscipline: { ...IDENTITY_ATOMIC_CLAIM_POLICY },
      admittedBy: {
        entityId: "fibre.world-kernel",
        kind: "institution",
        displayName: "Fibre World Kernel",
      },
      evidenceClassification: "exogenous",
      sourceMode: "fibre_derivation",
    },
  };
  const stored = identity.recordAssertion(assertion);
  identity.close();
  return stored;
}

function capsule() {
  return {
    threadId: fixture.threadId,
    snapshotVersion: 1,
    requestId: "req_m2_live_causal_wire_film_restoration",
    requestFingerprint: `sha256:${"b".repeat(64)}`,
    identity: `${fixture.identity.name}: ${fixture.identity.selfDescription}`,
    selfModel: fixture.currentState.selfModel,
    semanticTraits: {},
    needs: [],
    feelings: [],
    semanticState: [],
    resolvedMemories: [],
    obligations: [],
    permissions: ["handle_archival_material"],
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Restore a badly torn 16mm family film reel using archival splicing while preserving as much of the original film as possible.",
    statedNeed: "This is the only surviving copy of a family film and irreversible damage should be minimized.",
    acceptanceCriteria: "Use archival handling, preserve original frames where possible, and document any irreversible loss.",
    knownAlternatives: [],
    causalContext: { selectionAuthority: "fibre" },
  };
}

async function main() {
  const directory = mkdtempSync(join(tmpdir(), "fibre-m2-live-causal-wire-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    seed(databasePath);
    const stored = recordDevelopmentAssertion(databasePath);

    const inspector = openIdentityInspectionStore(databasePath);
    const identityView = inspector.getCurrentIdentityView(fixture.threadId);
    inspector.close();

    const selected = identityView.assertions.find(
      (item) => item.assertionId === stored.assertion.assertionId,
    );
    if (selected === undefined) throw new Error("development assertion is not present in durable #37 identity");

    const result = await runM2IdentityCausalWirePreflight({
      capsule: capsule(),
      identityView,
      modelAdapter: guardianModelAdapterFromEnvironment(),
      clientRequestId: "m2-causal-wire-live-proof",
    });

    const passed =
      result.counterfactual.claimCitedWithAssertion === true &&
      result.counterfactual.claimCitedWithoutAssertion === false &&
      result.counterfactual.judgmentChanged === true;

    console.log(JSON.stringify({
      evidentiaryStatus: "development_preflight_only_no_standing_credit",
      passed,
      projection: {
        assertionId: result.projection.assertionId,
        claimId: result.projection.claimId,
        assertionDigest: result.projection.assertionDigest,
        identityViewDigest: result.projection.identityViewDigest,
        meaning: result.projection.meaning,
        modelEvidenceRef: result.projection.modelEvidenceRef,
      },
      counterfactual: result.counterfactual,
      withAssertion: {
        output: result.withAssertion.output,
        provenance: result.withAssertion.provenance,
      },
      withoutAssertion: {
        output: result.withoutAssertion.output,
        provenance: result.withoutAssertion.provenance,
      },
    }, null, 2));

    if (!passed) {
      throw new Error("real-model causal-wire preflight did not demonstrate a load-bearing claim differential");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

await main();
