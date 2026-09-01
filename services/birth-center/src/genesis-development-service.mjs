import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
  GENESIS_PASS_B_RESPONSE_SCHEMA,
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  canonicalJson,
  sha256,
} from "fibre/world-kernel/genesis-development-contracts";

import { generateGenesisLifeCandidate } from "./genesis-life-development.mjs";
import {
  buildGenesisDevelopmentPlan,
  hydrateGenesisDevelopmentPlan,
  serializeGenesisDevelopmentPlan,
} from "./genesis-development-plan.mjs";
import {
  buildGenesisAdmissionPackage,
  buildGenesisPublicationCognition,
} from "./genesis-publication.mjs";

export const GENESIS_DEVELOPMENT_SERVICE_VERSION = "fibre-genesis-development-service-v3";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function assertRuntime(runtime) {
  if (!runtime || typeof runtime !== "object" || typeof runtime.durableAdapter !== "function" || typeof runtime.submitBirth !== "function") {
    throw new TypeError("Genesis development service requires a Birth Center runtime");
  }
  if (!runtime.provisionalBirthStore || typeof runtime.provisionalBirthStore.get !== "function") {
    throw new TypeError("Genesis development service requires Birth Center provisional birth lookup");
  }
  if (
    !runtime.developmentRequestStore ||
    typeof runtime.developmentRequestStore.reserve !== "function" ||
    typeof runtime.developmentRequestStore.saveAdmission !== "function" ||
    typeof runtime.developmentRequestStore.markSubmitted !== "function"
  ) {
    throw new TypeError("Genesis development service requires durable development request reservation");
  }
  return runtime;
}

function assertAdapter(name, adapter) {
  if (!adapter || typeof adapter !== "object" || typeof adapter.invoke !== "function") {
    throw new TypeError(`${name} must expose invoke()`);
  }
  return adapter;
}

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Genesis development activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function bestEffortRecord(activity, record) {
  if (activity === null) return;
  try { await activity.record(record); } catch {}
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation();
  return activity.runStage(metadata, operation);
}

function activityContext(plan) {
  return Object.freeze({
    requestId: plan.requestId,
    genesisId: plan.genesisId,
    threadId: plan.threadId,
  });
}

function cognitionStage(clientRequestId) {
  if (typeof clientRequestId !== "string") return "birth.genesis.cognition_call";
  if (clientRequestId.includes(":pass-a:")) {
    return clientRequestId.includes("repair")
      ? "birth.genesis.history.repair_call"
      : "birth.genesis.history.cognition_call";
  }
  if (clientRequestId.includes(":pass-b:")) return "birth.genesis.memory_selection.cognition_call";
  if (clientRequestId.includes(":pass-c:initial-")) return "birth.genesis.meaning_formation.cognition_call";
  if (clientRequestId.includes(":pass-c:reinterpret:")) return "birth.genesis.meaning_reinterpretation.cognition_call";
  return "birth.genesis.cognition_call";
}

function providerRequestId(result) {
  const value = result?.provenance?.providerRequestId;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function instrumentDurableCognitionAdapter({
  baseAdapter,
  birthRuntime,
  activity,
  context,
}) {
  const observations = new Map();
  const durable = birthRuntime.durableAdapter(baseAdapter, {
    observer(event) {
      if (typeof event?.clientRequestId === "string") observations.set(event.clientRequestId, event.type);
    },
  });
  return Object.freeze({
    provider: durable.provider,
    modelId: durable.modelId,
    configuration: structuredClone(durable.configuration),
    async invoke(args) {
      const stage = cognitionStage(args?.clientRequestId);
      const result = await runActivityStage(activity, {
        ...context,
        stage,
        attempt: 1,
      }, async () => durable.invoke(args));
      const observation = observations.get(args?.clientRequestId);
      const replay = observation === "durable_model_replay";
      const requestId = providerRequestId(result);
      await bestEffortRecord(activity, {
        ...context,
        stage: replay ? `${stage}.durable_replay` : `${stage}.provider_commit`,
        status: "succeeded",
        attempt: 1,
        message: replay ? "Reused durable model result" : "Committed durable provider result",
        evidence: requestId === null ? {} : { providerRequestId: requestId },
      });
      return result;
    },
  });
}

function currentCognition({ creativeAdapter, repairAdapter }) {
  return buildGenesisPublicationCognition({
    creativeAdapter,
    repairAdapter,
    passAPromptMaterial: GENESIS_LIFE_PASS_A_PROMPT,
    passASchemaMaterial: GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
    passBPromptMaterial: GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
    passBSchemaMaterial: GENESIS_PASS_B_RESPONSE_SCHEMA,
    passCPromptMaterial: {
      initial: GENESIS_PASS_C_INITIAL_PROMPT,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
    },
    passCSchemaMaterial: {
      initial: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
    },
    repairPromptMaterial: GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
    repairSchemaMaterial: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  });
}

function replayResult(reservation, provisional) {
  if (reservation.status !== "submitted" || reservation.submissionResult === null) return null;
  if (provisional === null) {
    throw new Error(`submitted Genesis development ${reservation.requestId} has no provisional Birth record`);
  }
  return Object.freeze({
    ...structuredClone(reservation.submissionResult),
    status: provisional.status,
    idempotent: true,
    generated: false,
  });
}

export function createGenesisDevelopmentService({
  runtime,
  creativeAdapter,
  repairAdapter = creativeAdapter,
  activityRecorder = null,
  now = () => new Date().toISOString(),
  randomIntFn,
} = {}) {
  const birthRuntime = assertRuntime(runtime);
  const creativeBase = assertAdapter("Genesis creative adapter", creativeAdapter);
  const repairBase = assertAdapter("Genesis repair adapter", repairAdapter);
  const activity = optionalActivityRecorder(activityRecorder);
  if (typeof now !== "function") throw new TypeError("Genesis development service now must be a function");

  return Object.freeze({
    serviceVersion: GENESIS_DEVELOPMENT_SERVICE_VERSION,

    async develop(developmentRequest) {
      const builtPlan = buildGenesisDevelopmentPlan(developmentRequest);
      const context = activityContext(builtPlan);
      await bestEffortRecord(activity, {
        ...context,
        stage: "birth.request.plan",
        status: "succeeded",
        attempt: 1,
      });

      const serializedPlan = serializeGenesisDevelopmentPlan(builtPlan);
      const planDigest = digest(serializedPlan);
      const reservation = await runActivityStage(activity, {
        ...context,
        stage: "birth.request.persist",
        attempt: 1,
        evidence: { digest: planDigest },
      }, async () => birthRuntime.developmentRequestStore.reserve({
        requestId: builtPlan.requestId,
        requestDigest: builtPlan.requestDigest,
        plan: serializedPlan,
      }));
      if (reservation.planDigest !== planDigest) {
        throw new Error(`durable Genesis development plan digest drift for ${builtPlan.requestId}`);
      }
      const plan = hydrateGenesisDevelopmentPlan(reservation.plan);
      const existingProvisional = birthRuntime.provisionalBirthStore.get(plan.genesisId);
      const replay = replayResult(reservation, existingProvisional);
      if (replay !== null) {
        await bestEffortRecord(activity, {
          ...context,
          stage: "birth.request.resume",
          status: "succeeded",
          attempt: 1,
          message: "Reused submitted Genesis development",
        });
        return replay;
      }

      let admission = reservation.admission;
      if (admission === null) {
        const creative = instrumentDurableCognitionAdapter({
          baseAdapter: creativeBase,
          birthRuntime,
          activity,
          context,
        });
        const repair = instrumentDurableCognitionAdapter({
          baseAdapter: repairBase,
          birthRuntime,
          activity,
          context,
        });
        const candidate = await runActivityStage(activity, {
          ...context,
          stage: "birth.genesis.start",
          attempt: 1,
        }, async () => generateGenesisLifeCandidate({
          slotPlan: plan,
          adapter: creative,
          repairAdapter: repair,
          attemptStartedAt: reservation.createdAt,
        }));
        admission = await runActivityStage(activity, {
          ...context,
          stage: "birth.genesis.compile",
          attempt: 1,
          evidence: { digest: planDigest },
        }, async () => {
          const publicationAt = now();
          let compiled = {
            ...buildGenesisAdmissionPackage({
              candidate,
              slotPlan: plan,
              cognition: currentCognition({ creativeAdapter: creativeBase, repairAdapter: repairBase }),
              publicationAt,
              randomIntFn,
            }),
            developmentPlanDigest: planDigest,
          };
          compiled = birthRuntime.developmentRequestStore.saveAdmission(plan.requestId, compiled).admission;
          return compiled;
        });
      } else {
        await bestEffortRecord(activity, {
          ...context,
          stage: "birth.genesis.compile",
          status: "succeeded",
          attempt: 1,
          message: "Reused durable Genesis admission package",
          evidence: { digest: planDigest },
        });
      }

      const accepted = await runActivityStage(activity, {
        ...context,
        stage: "birth.publish.prepare",
        attempt: 1,
        evidence: { fibreIdentityNumber: admission.civilRegistration.fibreIdentityNumber },
      }, async () => birthRuntime.submitBirth(admission, { activityContext: context }));
      const result = Object.freeze({
        serviceVersion: GENESIS_DEVELOPMENT_SERVICE_VERSION,
        requestId: plan.requestId,
        requestDigest: plan.requestDigest,
        developmentPlanDigest: planDigest,
        genesisId: plan.genesisId,
        threadId: plan.threadId,
        fibreIdentityNumber: admission.civilRegistration.fibreIdentityNumber,
        status: accepted.status,
        idempotent: accepted.idempotent === true,
        generated: reservation.admission === null,
      });
      await runActivityStage(activity, {
        ...context,
        stage: "birth.publish.complete",
        attempt: 1,
        evidence: { fibreIdentityNumber: result.fibreIdentityNumber },
      }, async () => birthRuntime.developmentRequestStore.markSubmitted(plan.requestId, result));
      return result;
    },
  });
}
