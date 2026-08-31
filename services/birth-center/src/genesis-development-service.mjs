import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-a.mjs";
import { GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA } from "#services/world-kernel/src/genesis-historical-realization-v1.mjs";
import { GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA } from "#services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-b.mjs";
import { GENESIS_PASS_B_RESPONSE_SCHEMA } from "#services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";

import { generateGenesisLifeCandidate } from "./genesis-life-development.mjs";
import { hydrateGenesisDevelopmentPlan } from "./genesis-development-plan.mjs";
import {
  buildGenesisAdmissionPackage,
  buildGenesisPublicationCognition,
} from "./genesis-publication.mjs";

export const GENESIS_DEVELOPMENT_SERVICE_VERSION = "fibre-genesis-development-service-v1";

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
  return runtime;
}

function assertAdapter(name, adapter) {
  if (!adapter || typeof adapter !== "object" || typeof adapter.invoke !== "function") {
    throw new TypeError(`${name} must expose invoke()`);
  }
  return adapter;
}

function existingDevelopmentResult(existing, planDigest, plan) {
  if (existing === null) return null;
  if (existing.threadId !== plan.threadId) {
    throw new Error(`Genesis development ${plan.genesisId} already belongs to another Thread`);
  }
  if (existing.bundle?.developmentPlanDigest !== planDigest) {
    throw new Error(`Genesis development ${plan.genesisId} already exists for different development material`);
  }
  return Object.freeze({
    serviceVersion: GENESIS_DEVELOPMENT_SERVICE_VERSION,
    genesisId: existing.genesisId,
    threadId: existing.threadId,
    fibreIdentityNumber: existing.bundle?.civilRegistration?.fibreIdentityNumber ?? null,
    status: existing.status,
    idempotent: true,
    generated: false,
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

    async develop(serializedPlan) {
      const plan = hydrateGenesisDevelopmentPlan(serializedPlan);
      const planDigest = digest(serializedPlan);
      const existing = birthRuntime.provisionalBirthStore.get(plan.genesisId);
      const replay = existingDevelopmentResult(existing, planDigest, plan);
      if (replay !== null) return replay;

      const creative = birthRuntime.durableAdapter(creativeBase);
      const repair = birthRuntime.durableAdapter(repairBase);
      const attemptStartedAt = now();
      const candidate = await generateGenesisLifeCandidate({
        slotPlan: plan,
        adapter: creative,
        repairAdapter: repair,
        attemptStartedAt,
      });
      const publicationAt = now();
      const admission = {
        ...buildGenesisAdmissionPackage({
          candidate,
          slotPlan: plan,
          cognition: currentCognition({ creativeAdapter: creativeBase, repairAdapter: repairBase }),
          publicationAt,
          randomIntFn,
        }),
        developmentPlanDigest: planDigest,
      };
      const accepted = await birthRuntime.submitBirth(admission);
      return Object.freeze({
        serviceVersion: GENESIS_DEVELOPMENT_SERVICE_VERSION,
        genesisId: plan.genesisId,
        threadId: plan.threadId,
        fibreIdentityNumber: admission.civilRegistration.fibreIdentityNumber,
        status: accepted.status,
        idempotent: accepted.idempotent === true,
        generated: true,
      });
    },
  });
}
