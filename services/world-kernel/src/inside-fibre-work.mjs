import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { runInteriorCognition } from "./interior-cognition.mjs";
import { replanForAcceptedInsideFibreWork } from "./inside-fibre-work-planning.mjs";

export const INSIDE_FIBRE_VISITOR_WORK = Object.freeze({
  kind:"inside_fibre_visitor_availability",
  mediatedContext:"insidefibre:visitor-work",
  purpose:"Meet insidefibre.com visitors during the agreed availability window.",
});

const DECISIONS = Object.freeze(["accept","decline"]);

const WORK_OFFER_ADAPTER = Object.freeze({
  id:"inside-fibre-work-offer",
  instruction:`Decide whether this Thread wants to accept the bounded paid Inside Fibre visitor-availability work described in the external context.
This is real voluntary work: accepting creates a future commitment to be available to meet insidefibre.com visitors during the stated window. Declining creates no commitment.
Compensation is one consideration, never a command. Consider the actual offered window, current resources, current lived situation, any Flight Plan coverage Fibre supplied, and the developed person/history selected by Interior Cognition.
Do not assume the Thread needs money, wants visitors, is free merely because no plan is shown, or should accept because Fibre offered the work.
Return accept or decline plus a concise private operator-facing reason. Do not author a Flight Plan, move the Thread, promise any work beyond visitor availability, expose private records, or treat acceptance as consent to arbitrary visitor requests.`,
  resultSchema:{
    type:"object",
    additionalProperties:false,
    required:["decision","reason"],
    properties:{
      decision:{ type:"string", enum:DECISIONS },
      reason:{ type:"string", minLength:1, maxLength:500 },
    },
  },
});

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
  return owner;
}

function normalizeOffer({ startAt, endAt, fibreCredits }) {
  assertIsoTimestamp("Inside Fibre work startAt", startAt);
  assertIsoTimestamp("Inside Fibre work endAt", endAt);
  if (Date.parse(endAt) <= Date.parse(startAt)) {
    throw new TypeError("Inside Fibre work window must end after it starts");
  }
  assertFiniteNumber("Inside Fibre work fibreCredits", fibreCredits, { integer:true, minimum:1 });
  const core = Object.freeze({
    kind:INSIDE_FIBRE_VISITOR_WORK.kind,
    startAt,
    endAt,
    mediatedContext:INSIDE_FIBRE_VISITOR_WORK.mediatedContext,
    purpose:INSIDE_FIBRE_VISITOR_WORK.purpose,
    compensation:Object.freeze({ fibreCredits }),
  });
  return Object.freeze({
    offerId:`work_offer_${sha256(canonicalJson(core)).slice(0, 48)}`,
    ...core,
  });
}

function cognitionWitness(cognition) {
  return Object.freeze({
    provider:cognition.provenance.provider,
    modelId:cognition.provenance.modelId,
    providerRequestId:cognition.provenance.providerRequestId ?? null,
    implementationProfile:structuredClone(cognition.implementationProfile),
    sourceThreadVersion:cognition.provenance.sourceThreadVersion,
    selectedEvidenceRefs:Object.freeze([...cognition.provenance.selectedEvidenceRefs]),
    evidenceRefs:Object.freeze([...cognition.evidenceRefs]),
    contextDigest:cognition.provenance.contextDigest,
  });
}

export function createInsideFibreWorkService({
  worldReader,
  livedNowStore,
  identityStore,
  semanticStateStore,
  memoryStore,
  situatedLifeStore,
  workStore,
  modelAdapter,
}) {
  requireMethod(worldReader, "Inside Fibre worldReader", "getThread");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "getCurrentSituation");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "latestPlan");
  requireMethod(identityStore, "Inside Fibre identityStore", "getCurrentIdentityView");
  requireMethod(semanticStateStore, "Inside Fibre semanticStateStore", "listCurrentState");
  requireMethod(memoryStore, "Inside Fibre memoryStore", "listCurrentMemories");
  requireMethod(situatedLifeStore, "Inside Fibre situatedLifeStore", "listCurrentLifeRelations");
  requireMethod(workStore, "Inside Fibre workStore", "getForOffer");
  requireMethod(workStore, "Inside Fibre workStore", "recordAcceptedCommitment");
  requireMethod(modelAdapter, "Inside Fibre modelAdapter", "invoke");

  const sourceStores = Object.freeze({
    worldStore:worldReader,
    identityStore,
    semanticStateStore,
    memoryStore,
    situatedLifeStore,
  });

  return Object.freeze({
    async reconcileAcceptedWork(commitmentId) {
      return replanForAcceptedInsideFibreWork({
        commitmentId,
        workStore,
        livedNowStore,
        worldStore:worldReader,
        identityStore,
        semanticStateStore,
        memoryStore,
        situatedLifeStore,
        modelAdapter,
      });
    },

    async considerOffer(input) {
      assertPlainObject("Inside Fibre work offer input", input);
      assertExactKeys("Inside Fibre work offer input", input, [
        "threadId",
        "at",
        "startAt",
        "endAt",
        "fibreCredits",
      ]);
      assertId("Inside Fibre work threadId", input.threadId);
      assertIsoTimestamp("Inside Fibre work at", input.at);
      const offer = normalizeOffer(input);
      if (Date.parse(offer.startAt) < Date.parse(input.at)) {
        throw new TypeError("Inside Fibre work cannot be offered after its window begins");
      }

      const existing = workStore.getForOffer(input.threadId, offer.offerId);
      if (existing !== null) {
        return Object.freeze({
          decision:"accept",
          offer,
          commitment:existing,
          cognition:null,
          reason:null,
          alreadyAccepted:true,
        });
      }

      const thread = worldReader.getThread(input.threadId, { required:false });
      if (thread === null || thread === undefined) {
        throw new TypeError(`Thread ${input.threadId} was not found`);
      }
      const fibreCredits = thread.accounts?.fibreCredits ?? 0;
      assertFiniteNumber("Thread Fibre Credits", fibreCredits, { integer:true, minimum:0 });

      const currentSituation = livedNowStore.getCurrentSituation(input.threadId);
      const currentPlan = livedNowStore.latestPlan(input.threadId, "personal", { at:input.at });
      const planAtWorkWindow = livedNowStore.latestPlan(input.threadId, "personal", { at:offer.startAt });

      const cognition = await runInteriorCognition({
        threadId:input.threadId,
        at:input.at,
        concern:{
          kind:"inside_fibre_work_offer",
          question:"Do I want to accept this bounded paid Inside Fibre visitor-availability work?",
          externalContext:{
            offer:structuredClone(offer),
            currentResources:{ fibreCredits },
            currentSituation:currentSituation === null ? null : structuredClone(currentSituation),
            currentFlightPlan:currentPlan === null ? null : structuredClone(currentPlan),
            flightPlanAtWorkWindow:planAtWorkWindow === null ? null : structuredClone(planAtWorkWindow),
          },
        },
        adapter:WORK_OFFER_ADAPTER,
        sourceStores,
        modelAdapter,
      });

      assertPlainObject("Inside Fibre work cognition result", cognition.result);
      assertExactKeys("Inside Fibre work cognition result", cognition.result, ["decision","reason"]);
      if (!DECISIONS.includes(cognition.result.decision)) {
        throw new TypeError("Inside Fibre work decision is invalid");
      }
      assertNonEmpty("Inside Fibre work decision reason", cognition.result.reason);

      const witness = cognitionWitness(cognition);
      if (cognition.result.decision === "decline") {
        return Object.freeze({
          decision:"decline",
          offer,
          commitment:null,
          cognition:witness,
          reason:cognition.result.reason,
          alreadyAccepted:false,
        });
      }

      const recorded = workStore.recordAcceptedCommitment({
        kind:offer.kind,
        offerId:offer.offerId,
        threadId:input.threadId,
        acceptedAt:input.at,
        startAt:offer.startAt,
        endAt:offer.endAt,
        mediatedContext:offer.mediatedContext,
        purpose:offer.purpose,
        compensation:structuredClone(offer.compensation),
        cognition:witness,
      });

      return Object.freeze({
        decision:"accept",
        offer,
        commitment:recorded.commitment,
        cognition:witness,
        reason:cognition.result.reason,
        alreadyAccepted:!recorded.created,
      });
    },
  });
}
