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
  now = () => new Date().toISOString(),
  randomIntFn,
} = {}) {
  const birthRuntime = assertRuntime(runtime);
  const creativeBase = assertAdapter("Genesis creative adapter", creativeAdapter);
  const repairBase = assertAdapter("Genesis repair adapter", repairAdapter);
  if (typeof now !== "function") throw new TypeError("Genesis development service now must be a function");

  return Object.freeze({
    serviceVersion: GENESIS_DEVELOPMENT_SERVICE_VERSION,

    async develop(developmentRequest) {
      const builtPlan = buildGenesisDevelopmentPlan(developmentRequest);
      const serializedPlan = serializeGenesisDevelopmentPlan(builtPlan);
      const planDigest = digest(serializedPlan);
      const reservation = birthRuntime.developmentRequestStore.reserve({
        requestId: builtPlan.requestId,
        requestDigest: builtPlan.requestDigest,
        plan: serializedPlan,
      });
      if (reservation.planDigest !== planDigest) {
        throw new Error(`durable Genesis development plan digest drift for ${builtPlan.requestId}`);
      }
      const plan = hydrateGenesisDevelopmentPlan(reservation.plan);
      const existingProvisional = birthRuntime.provisionalBirthStore.get(plan.genesisId);
      const replay = replayResult(reservation, existingProvisional);
      if (replay !== null) return replay;

      let admission = reservation.admission;
      if (admission === null) {
        const creative = birthRuntime.durableAdapter(creativeBase);
        const repair = birthRuntime.durableAdapter(repairBase);
        const candidate = await generateGenesisLifeCandidate({
          slotPlan: plan,
          adapter: creative,
          repairAdapter: repair,
          attemptStartedAt: reservation.createdAt,
        });
        const publicationAt = now();
        admission = {
          ...buildGenesisAdmissionPackage({
            candidate,
            slotPlan: plan,
            cognition: currentCognition({ creativeAdapter: creativeBase, repairAdapter: repairBase }),
            publicationAt,
            randomIntFn,
          }),
          developmentPlanDigest: planDigest,
        };
        admission = birthRuntime.developmentRequestStore.saveAdmission(plan.requestId, admission).admission;
      }

      const accepted = await birthRuntime.submitBirth(admission);
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
      birthRuntime.developmentRequestStore.markSubmitted(plan.requestId, result);
      return result;
    },
  });
}
