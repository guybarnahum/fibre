import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { CivilRegistryStore } from "#services/world-kernel/src/civil-registry-store.mjs";
import { openAutobiographicalMemoryInspectionStore } from "#services/world-kernel/src/autobiographical-memory-store.mjs";
import { openEmbodimentInspectionStore } from "#services/world-kernel/src/embodiment-store.mjs";
import { openIdentityInspectionStore } from "#services/world-kernel/src/identity-store.mjs";
import {
  IDENTITY_CONTEXT_PROJECTION_POLICY,
  buildIdentityContextWorkerPacket,
  compileIdentityContextCapsule,
} from "#services/world-kernel/src/identity-context-capsule.mjs";
import {
  IntegrityError,
  canonicalJson,
  threadStateHash,
} from "#services/world-kernel/src/persistence-common.mjs";
import { validateStoredThread } from "#services/world-kernel/src/persistence-domain.mjs";
import {
  normalizeSemanticStateRecord,
  semanticStateDigest,
} from "#services/world-kernel/src/semantic-state.mjs";
import { openSituatedLifeInspectionStore } from "#services/world-kernel/src/situated-life-store.mjs";
import { SymbolicGenomeStore } from "#services/world-kernel/src/symbolic-genome-store.mjs";

export const IDENTITY_CONTEXT_CHARACTERIZATION_REQUEST = Object.freeze({
  requestId: "req_identity_context_characterization",
  trigger: "fibre_validation",
  requester: Object.freeze({
    entityId: "fibre.validation",
    kind: "institution",
    displayName: "Fibre validation",
  }),
  objective: "Assess an unfamiliar consequential request where material evidence may be incomplete.",
  statedNeed: "Independent judgment grounded only in context Fibre selects for this local cognition task.",
  permissions: Object.freeze([]),
  acceptanceCriteria: "Do not rely on biography or private context that Fibre did not supply.",
});

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function openReadOnlyProjectionAdapter(databasePath) {
  const database = new DatabaseSync(databasePath, {
    readOnly: true,
    enableForeignKeyConstraints: true,
  });
  database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");

  function getThread(threadId) {
    const row = database.prepare(`
      SELECT thread_id,version,state_json,state_hash
      FROM threads WHERE thread_id=?
    `).get(threadId);
    if (row === undefined) throw new IntegrityError(`Thread ${threadId} was not found`);
    const thread = parseJson(`Thread ${threadId}`, row.state_json);
    validateStoredThread(threadId, thread);
    if (
      row.thread_id !== thread.threadId ||
      Number(row.version) !== thread.version ||
      row.state_hash !== threadStateHash(thread)
    ) {
      throw new IntegrityError(`Thread ${threadId} projection failed canonical state verification`);
    }
    return thread;
  }

  function tableExists(tableName) {
    return database.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
    ).get(tableName) !== undefined;
  }

  function listCurrentState(threadId) {
    if (!tableExists("semantic_state_records")) return [];
    return database.prepare(`
      SELECT r.state_id,r.thread_id,r.domain,r.dimension,r.target_json,r.state_text,
        r.evidence_refs_json,r.as_of,r.supersedes_state_id,r.provenance_json,
        r.visibility,r.staleness,r.state_digest
      FROM semantic_state_records r
      WHERE r.thread_id=?
        AND r.staleness='current'
        AND NOT EXISTS (
          SELECT 1 FROM semantic_state_records newer
          WHERE newer.supersedes_state_id=r.state_id
        )
      ORDER BY r.domain,r.dimension,r.as_of,r.state_id
    `).all(threadId).map((row) => {
      const record = normalizeSemanticStateRecord({
        stateId: row.state_id,
        threadId: row.thread_id,
        domain: row.domain,
        dimension: row.dimension,
        target: row.target_json === null
          ? null
          : parseJson(`semantic state ${row.state_id} target`, row.target_json),
        state: row.state_text,
        evidenceReferences: parseJson(
          `semantic state ${row.state_id} evidence`,
          row.evidence_refs_json,
        ),
        asOf: row.as_of,
        supersedes: row.supersedes_state_id,
        provenance: parseJson(
          `semantic state ${row.state_id} provenance`,
          row.provenance_json,
        ),
        visibility: row.visibility,
        staleness: row.staleness,
      });
      if (semanticStateDigest(record) !== row.state_digest) {
        throw new IntegrityError(`semantic state ${record.stateId} digest failed`);
      }
      return record;
    });
  }

  return {
    worldStore: { getThread },
    semanticStateStore: { listCurrentState },
    semanticStateStoragePresent() {
      return tableExists("semantic_state_records");
    },
    queryOnly() {
      return Number(database.prepare("PRAGMA query_only").get().query_only) === 1;
    },
    close() {
      database.close();
    },
  };
}

export function openIdentityContextInspectionContext(databasePath) {
  const absolutePath = resolve(databasePath);
  if (!existsSync(absolutePath)) throw new Error(`database does not exist: ${absolutePath}`);
  if (!statSync(absolutePath).isFile()) throw new Error(`database path is not a file: ${absolutePath}`);

  const projection = openReadOnlyProjectionAdapter(absolutePath);
  const identity = openIdentityInspectionStore(absolutePath);
  const memory = openAutobiographicalMemoryInspectionStore(absolutePath);
  const situated = openSituatedLifeInspectionStore(absolutePath);
  const embodiment = openEmbodimentInspectionStore(absolutePath);
  const genome = new SymbolicGenomeStore(absolutePath, { readOnly: true });
  const registry = new CivilRegistryStore(absolutePath);

  return {
    databasePath: absolutePath,
    sourceStores: {
      worldStore: projection.worldStore,
      identityStore: identity,
      memoryStore: memory,
      situatedLifeStore: situated,
      embodimentStore: embodiment,
      symbolicGenomeStore: genome,
      semanticStateStore: projection.semanticStateStore,
    },
    semanticStateStoragePresent() {
      return projection.semanticStateStoragePresent();
    },
    registrations() {
      return identity.listThreadIds()
        .map((threadId) => registry.getCivilRegistrationByThreadId(threadId, { required: false }))
        .filter((registration) => registration !== null)
        .sort((left, right) => left.fibreIdentityNumber.localeCompare(right.fibreIdentityNumber));
    },
    queryOnly() {
      return projection.queryOnly() &&
        identity.queryOnly() &&
        memory.queryOnly() &&
        situated.queryOnly() &&
        embodiment.queryOnly() &&
        genome.queryOnly();
    },
    close() {
      registry.close();
      genome.close();
      embodiment.close();
      situated.close();
      memory.close();
      identity.close();
      projection.close();
    },
  };
}

function countBy(values, key) {
  const counts = {};
  for (const item of values) {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function summarizeCapsule(registration, capsule, workerPacket, deterministic) {
  const sourceBindings = capsule.sourceSnapshot.bindings;
  const sourceKinds = countBy(sourceBindings, (item) => item.kind);
  const includedKinds = countBy(capsule.evidence, (item) => item.kind);
  const exclusionReasons = countBy(capsule.excludedRefs, (item) => item.reason);
  const workerKeys = Object.keys(workerPacket.modelInput);
  const expectedWorkerKeys = ["task", "actors", "evidence", "rules", "outputSchema"];
  const partitionCount = capsule.includedRefs.length + capsule.excludedRefs.length;

  const structuralChecks = {
    deterministic,
    selectionAuthorityFibre: capsule.selectionAuthority === "fibre",
    sourcePartitionExact: partitionCount === sourceBindings.length &&
      new Set([...capsule.includedRefs, ...capsule.excludedRefs.map((item) => item.ref)]).size ===
        sourceBindings.length,
    evidenceItemBound:
      capsule.evidence.length <= IDENTITY_CONTEXT_PROJECTION_POLICY.maximumEvidenceItems,
    evidenceByteBound:
      capsule.evidenceBytes <= IDENTITY_CONTEXT_PROJECTION_POLICY.maximumEvidenceBytes,
    workerBoundaryExact: canonicalJson(workerKeys) === canonicalJson(expectedWorkerKeys),
    protectedSourceExcluded: !capsule.evidence.some((item) => {
      const binding = sourceBindings.find((candidate) => candidate.ref === item.ref);
      return binding?.visibility === "protected_source";
    }),
    genomeExcluded: !capsule.evidence.some((item) => {
      const binding = sourceBindings.find((candidate) => candidate.ref === item.ref);
      return binding?.kind === "genome_locus";
    }),
    rawSituatedExcluded: !capsule.evidence.some((item) => {
      const binding = sourceBindings.find((candidate) => candidate.ref === item.ref);
      return binding?.kind === "life_relation" || binding?.kind === "place_episode";
    }),
    embodimentExcluded: !capsule.evidence.some((item) => {
      const binding = sourceBindings.find((candidate) => candidate.ref === item.ref);
      return binding?.kind === "embodiment";
    }),
  };

  return {
    threadId: registration.threadId,
    fibreIdentityNumber: registration.fibreIdentityNumber,
    snapshotVersion: capsule.snapshotVersion,
    capsuleDigest: capsule.capsuleDigest,
    sourceSnapshotDigest: capsule.sourceSnapshot.sourceSnapshotDigest,
    sourceCount: sourceBindings.length,
    sourceKinds,
    includedCount: capsule.evidence.length,
    includedKinds,
    includedRefs: [...capsule.includedRefs],
    excludedCount: capsule.excludedRefs.length,
    exclusionReasons,
    evidenceBytes: capsule.evidenceBytes,
    hasIdentityEvidence: (includedKinds.identity ?? 0) > 0,
    hasMemoryEvidence: (includedKinds.memory ?? 0) > 0,
    hasSemanticStateEvidence: (includedKinds.current_state ?? 0) > 0,
    consumerReady: capsule.evidence.length > 0,
    structuralChecks,
    ok: Object.values(structuralChecks).every(Boolean),
  };
}

function selectRegistrations(allRegistrations, fins) {
  if (fins.length === 0) return allRegistrations;
  const byFin = new Map(allRegistrations.map((item) => [item.fibreIdentityNumber, item]));
  return fins.map((fin) => {
    const registration = byFin.get(fin);
    if (registration === undefined) throw new Error(`FIN ${fin} is not registered in this World`);
    return registration;
  });
}

export function inspectIdentityContext(
  databasePath,
  {
    request = IDENTITY_CONTEXT_CHARACTERIZATION_REQUEST,
    fins = [],
  } = {},
  {
    openContext = openIdentityContextInspectionContext,
  } = {},
) {
  const context = openContext(databasePath);
  try {
    if (!context.queryOnly()) throw new Error("identity context inspection source is not read-only");
    const registrations = selectRegistrations(context.registrations(), fins);
    if (registrations.length === 0) {
      throw new Error("no civil-registered Threads were found in this World");
    }

    const threads = registrations.map((registration) => {
      const first = compileIdentityContextCapsule({
        threadId: registration.threadId,
        request,
        sourceStores: context.sourceStores,
      });
      const replay = compileIdentityContextCapsule({
        threadId: registration.threadId,
        request,
        sourceStores: context.sourceStores,
      });
      const packet = buildIdentityContextWorkerPacket(first, request);
      return summarizeCapsule(
        registration,
        first,
        packet,
        first.capsuleDigest === replay.capsuleDigest &&
          first.sourceSnapshot.sourceSnapshotDigest === replay.sourceSnapshot.sourceSnapshotDigest &&
          canonicalJson(first) === canonicalJson(replay),
      );
    });

    return {
      databasePath: context.databasePath ?? resolve(databasePath),
      sourceReadOnly: true,
      semanticStateStoragePresent:
        typeof context.semanticStateStoragePresent === "function"
          ? context.semanticStateStoragePresent()
          : null,
      requestId: request.requestId,
      projectionPolicy: {
        id: IDENTITY_CONTEXT_PROJECTION_POLICY.id,
        version: IDENTITY_CONTEXT_PROJECTION_POLICY.version,
      },
      providerAccess: "not_present_in_inspector",
      threadCount: threads.length,
      consumerReadyThreads: threads.filter((item) => item.consumerReady).length,
      identityEvidenceThreads: threads.filter((item) => item.hasIdentityEvidence).length,
      memoryEvidenceThreads: threads.filter((item) => item.hasMemoryEvidence).length,
      semanticStateEvidenceThreads: threads.filter((item) => item.hasSemanticStateEvidence).length,
      structurallyValidThreads: threads.filter((item) => item.ok).length,
      allStructuralChecksPass: threads.every((item) => item.ok),
      allThreadsConsumerReady: threads.every((item) => item.consumerReady),
      threads,
    };
  } finally {
    context.close();
  }
}

export function formatIdentityContextInspection(report) {
  const lines = [
    `Identity Context Projection: ${report.allStructuralChecksPass ? "STRUCTURALLY CLEAR" : "STRUCTURAL FAILURE"}`,
    `Path: ${report.databasePath}`,
    `Source mode: ${report.sourceReadOnly ? "read-only" : "unknown"}`,
    `Provider access: ${report.providerAccess}`,
    `Semantic-state storage: ${report.semanticStateStoragePresent === null ? "unknown" : report.semanticStateStoragePresent ? "present" : "absent"}`,
    `Threads: ${report.structurallyValidThreads}/${report.threadCount} structurally valid`,
    `Consumer-ready projections: ${report.consumerReadyThreads}/${report.threadCount}`,
    `Evidence coverage: identity=${report.identityEvidenceThreads}/${report.threadCount}, memory=${report.memoryEvidenceThreads}/${report.threadCount}, semantic-state=${report.semanticStateEvidenceThreads}/${report.threadCount}`,
  ];
  for (const item of report.threads) {
    lines.push(
      `${item.fibreIdentityNumber}  ${item.threadId}`,
      `  sources=${item.sourceCount} included=${item.includedCount} excluded=${item.excludedCount} bytes=${item.evidenceBytes}`,
      `  included=${JSON.stringify(item.includedKinds)} exclusions=${JSON.stringify(item.exclusionReasons)}`,
      `  capsule=${item.capsuleDigest}`,
      `  standing=${item.consumerReady ? "consumer-ready candidate" : "NO USABLE SEMANTIC EVIDENCE FOR THIS PROBE"}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function parseArguments(args) {
  let json = false;
  let databasePath = null;
  const fins = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--json") json = true;
    else if (value === "--fin") {
      const fin = args[index + 1] ?? null;
      if (fin === null) throw new Error("--fin requires a Fibre Identity Number");
      fins.push(fin);
      index += 1;
    } else if (value === "--help" || value === "-h") {
      return { help: true, json, databasePath, fins };
    } else if (value.startsWith("-")) {
      throw new Error(`unknown option: ${value}`);
    } else if (databasePath === null) {
      databasePath = value;
    } else {
      throw new Error("only one database path may be supplied");
    }
  }
  if (new Set(fins).size !== fins.length) throw new Error("--fin values must be unique");
  return { help: false, json, databasePath, fins };
}

function usage() {
  return [
    "Usage: node tools/inspect/inspect-identity-context.mjs <database.sqlite> [--fin <FIN>]... [--json]",
    "",
    "Read-only provider-free characterization of Identity Context Capsule projection",
    "against civil-registered Threads. Reports refs/counts/digests, never evidence prose.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help || options.databasePath === null) {
    process.stdout.write(usage());
    process.exitCode = options.help ? 0 : 2;
    return;
  }
  const report = inspectIdentityContext(options.databasePath, { fins: options.fins });
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : formatIdentityContextInspection(report),
  );
  if (!report.allStructuralChecksPass) process.exitCode = 1;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
