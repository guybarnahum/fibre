const STATUS_EXPLANATIONS = {
  frozen: "Durable life state is persisted. This status does not imply that a runtime is currently thinking or acting.",
  active: "The Thread is represented as active in the current world state.",
  retired: "The Thread remains part of the world record but is no longer expected to take new work.",
  dormant: "Durable life state is persisted and no active runtime is implied. The Thread may later be thawed through an authorized runtime lease.",
  thawing: "The world record is transitioning into temporary cognition. Durable state remains authoritative until an accepted freeze persists changes.",
  freezing: "A runtime is closing and proposed life changes are being checked before they can become durable Thread state.",
};

const FIELD_HELP = {
  stateHash: "A technical fingerprint of the projected state. It helps detect drift; it is not a description of the Thread.",
  expectedVersion: "The Thread version the operation expected before it ran.",
  resultingVersion: "The Thread version produced by the operation.",
  snapshotVersion: "The historical Thread version used when the request was appraised.",
  dignityBand: "How strongly the request matched this Thread's individualized identity, values, relationships, and distinctive advantage over a generic model.",
  desiredAction: "The participation response recorded by the Thread, such as engage, clarify, defer, or refuse.",
  authorizedAction: "The action the world kernel authorized. It may differ from the Thread's own recorded response when a valid recorded obligation compels participation.",
  obligationReferences: "The exact unresolved obligation references used to justify overriding the Thread's recorded response.",
  guardianDecision: "The Goal Guardian's decision about whether the proposed runtime work stayed within the authorized goal.",
  leaseStatus: "The status of the temporary, exclusive right to run this Thread.",
  kernelTime: "Time observed from the world kernel rather than from the browser.",
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function nested(value, ...paths) {
  for (const path of paths) {
    let current = value;
    let found = true;
    for (const segment of path.split(".")) {
      const object = Object(current);
      if (current === null || current === undefined || !Object.hasOwn(object, segment)) {
        found = false;
        break;
      }
      current = object[segment];
    }
    if (found && current !== undefined && current !== null) return current;
  }
  return null;
}

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function quote(value) {
  return typeof value === "string" && value.trim() ? `“${value.trim()}”` : null;
}

function shortHash(value) {
  if (typeof value !== "string") return value;
  return value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;
}

export function humanizeLabel(key = "") {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b(id|ids|url|usd|api)\b/gi, (value) => value.toUpperCase())
    .replace(/^\w/, (value) => value.toUpperCase());
}

export function formatHumanValue(value, key = "") {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatHumanValue(item)).join(", ") : "None";
  if (typeof value === "number") return new Intl.NumberFormat("en-US").format(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return `${date.toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC")}`;
    }
  }
  if (/hash/i.test(key)) return shortHash(value);
  return String(value).replace(/_/g, " ");
}

function fact(label, value, key = "", help = null) {
  return {
    label,
    value: formatHumanValue(value, key),
    help: help ?? FIELD_HELP[key] ?? null,
  };
}

function compactFacts(values) {
  return values.filter((entry) => entry.value !== "Not recorded");
}

export function explainInspection(inspection = {}) {
  const thread = inspection.thread ?? {};
  const name = thread.identity?.name ?? thread.threadId ?? "This Thread";
  const status = thread.status ?? "unknown";
  const version = thread.version ?? "unknown";
  const selfModel = quote(thread.currentState?.selfModel);
  const events = count(inspection.events);
  const requests = count(inspection.private?.requests);
  const runtimes = count(inspection.private?.runtimes);
  const feelings = thread.currentState?.feelings ?? [];
  const needs = thread.currentState?.needs ?? [];
  const intentions = thread.currentState?.unresolvedIntentions ?? [];

  return {
    eyebrow: "Plain-language overview",
    title: `What the record says about ${name}`,
    summary: `${name} is currently ${formatHumanValue(status)} at version ${version}. ${selfModel ? `The current self-model is ${selfModel}` : "No current self-model is recorded."}`,
    facts: compactFacts([
      fact("Life-state status", status),
      fact("Current version", version),
      fact("Public life events", events),
      fact("Private request attempts", requests),
      fact("Runtime episodes", runtimes),
      fact("Memories referenced", count(thread.memoryRefs)),
      fact("Relationships referenced", count(thread.relationshipRefs)),
      fact("Kernel time", nested(inspection, "kernel.kernelTime", "kernelTime"), "kernelTime"),
    ]),
    notes: [
      STATUS_EXPLANATIONS[status] ?? "The status is shown exactly as recorded by the world kernel.",
      feelings.length ? `Current feelings: ${feelings.join(", ")}.` : "No current feelings are recorded.",
      needs.length ? `Current needs: ${needs.join("; ")}.` : "No current needs are recorded.",
      intentions.length ? `Open intentions: ${intentions.join("; ")}.` : "No unresolved intentions are recorded.",
      "This editor is inspection-only. Reading this summary does not activate the Thread or authorize work.",
    ],
  };
}

function failedChecks(value, prefix = "") {
  if (value === null || value === undefined || typeof value !== "object") return [];
  const failures = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child === false) failures.push(path);
    else if (child && typeof child === "object") failures.push(...failedChecks(child, path));
  }
  return failures;
}

function recognizableIntegrityReport(integrity) {
  if (integrity === null || integrity === undefined || typeof integrity !== "object" || Array.isArray(integrity)) {
    return false;
  }
  return [
    "threadId",
    "version",
    "snapshotVersion",
    "eventCount",
    "eventsVerified",
    "stateHash",
    "projectedStateHash",
    "memoryProjection",
  ].some((key) => Object.hasOwn(integrity, key));
}

export function integrityVerdict(integrity) {
  if (!recognizableIntegrityReport(integrity)) {
    return {
      kind: "unknown",
      label: "Integrity unknown",
      title: "Integrity report unavailable",
      failures: [],
    };
  }
  const failures = failedChecks(integrity);
  if (failures.length) {
    return {
      kind: "failed",
      label: "Review needed",
      title: "Some checks reported failure",
      failures,
    };
  }
  return {
    kind: "reported",
    label: "No failure reported",
    title: "No failure reported",
    failures: [],
  };
}

export function integrityBadgeModel(integrity) {
  const verdict = integrityVerdict(integrity);
  return {
    label: verdict.label,
    state: verdict.kind === "failed" ? "error" : verdict.kind,
  };
}

export function explainIntegrity(integrity) {
  const verdict = integrityVerdict(integrity);
  const version = firstDefined(integrity?.version, integrity?.snapshotVersion);
  const eventCount = firstDefined(integrity?.eventCount, integrity?.eventsVerified);
  const memoryCount = nested(integrity, "memoryProjection.freezeCreatedMemoryCount");
  const stateHash = firstDefined(integrity?.stateHash, integrity?.projectedStateHash);

  if (verdict.kind === "unknown") {
    return {
      eyebrow: "Integrity in plain language",
      title: verdict.title,
      summary: "The editor did not receive a recognizable integrity report. Do not treat this Thread state as verified; inspect the connection error or exact payload.",
      facts: [],
      notes: [
        "Unknown is intentionally different from verified. The readable layer does not infer integrity from the Thread projection alone.",
        FIELD_HELP.stateHash,
      ],
    };
  }

  return {
    eyebrow: "Integrity in plain language",
    title: verdict.title,
    summary: verdict.kind === "failed"
      ? `The integrity report contains ${verdict.failures.length} failed check${verdict.failures.length === 1 ? "" : "s"}. Review the technical JSON before relying on this state.`
      : "The returned integrity report contains no failed boolean check. This means no failure was reported in this payload; it is not an independent browser-side verification verdict.",
    facts: compactFacts([
      fact("Reported version", version),
      fact("Events represented", eventCount),
      fact("Freeze-created memories", memoryCount),
      fact("State fingerprint", stateHash, "stateHash"),
    ]),
    notes: verdict.kind === "failed"
      ? [`Failed paths: ${verdict.failures.map(humanizeLabel).join(", ")}.`, FIELD_HELP.stateHash]
      : [
          "Integrity answers whether stored records agree. It does not decide whether the Thread's choices were wise or desirable.",
          "The world kernel reports authoritative integrity failures as request errors; the badge therefore says no failure reported rather than verified.",
          FIELD_HELP.stateHash,
        ],
  };
}

export function explainEvent(event = {}) {
  const eventType = event.eventType ?? event.type ?? "Unknown event";
  const sequence = firstDefined(event.sequence, event.eventSequence);
  const expectedVersion = firstDefined(event.expectedVersion, event.previousVersion);
  const resultingVersion = firstDefined(event.resultingVersion, event.version);
  const actor = nested(event, "actor.displayName", "actor.entityId", "command.actor.displayName", "command.actor.entityId");
  const summary = nested(event, "payload.summary", "summary", "data.summary");
  const occurredAt = firstDefined(event.occurredAt, event.createdAt);

  return {
    eyebrow: "Public life event",
    title: `${sequence === null ? "Event" : `Event ${sequence}`}: ${humanizeLabel(eventType)}`,
    summary: summary
      ? String(summary)
      : `This recorded event moved the Thread${expectedVersion === null ? "" : ` from version ${expectedVersion}`}${resultingVersion === null ? "" : ` to version ${resultingVersion}`}.`,
    facts: compactFacts([
      fact("When", occurredAt),
      fact("Actor", actor),
      fact("Version before", expectedVersion, "expectedVersion"),
      fact("Version after", resultingVersion, "resultingVersion"),
      fact("Event ID", firstDefined(event.eventId, event.id)),
      fact("Command ID", nested(event, "command.commandId", "commandId")),
    ]),
    notes: [
      "Public events are the durable, replayable history used to reconstruct the Thread's projected state.",
      "The technical JSON remains available below for exact payload and provenance fields.",
    ],
  };
}

function requestRecord(selection = {}) {
  const detail = selection.detail ?? selection;
  return firstDefined(detail.request, detail.attempt, detail.activationRequest, detail.record, detail);
}

export function explainRequest(selection = {}) {
  const request = requestRecord(selection);
  const requester = firstDefined(
    nested(request, "requester.displayName", "requester.entityId"),
    nested(selection, "detail.requester.displayName", "detail.requester.entityId"),
    "Unknown requester",
  );
  const objective = firstDefined(request.objective, nested(request, "request.objective"), "No objective recorded");
  const desiredAction = firstDefined(request.desiredAction, nested(request, "appraisal.desiredAction", "participationStance.desiredAction"));
  const dignityBand = firstDefined(request.dignityBand, nested(request, "appraisal.dignityBand", "participationStance.dignityBand"));
  const requestId = firstDefined(request.requestId, nested(request, "request.requestId"));
  const snapshotVersion = firstDefined(request.snapshotVersion, nested(request, "snapshot.version", "appraisal.snapshotVersion"));
  const occurredAt = firstDefined(request.occurredAt, request.createdAt, nested(request, "appraisal.occurredAt"));
  const integrityOk = firstDefined(
    nested(selection, "integrity.verification.ok", "integrity.ok", "integrity.verified"),
    null,
  );

  return {
    eyebrow: "Restricted participation trace",
    title: `${requester} asked: ${quote(objective) ?? objective}`,
    summary: `The recorded response is ${formatHumanValue(desiredAction)} with a ${formatHumanValue(dignityBand)} dignity match. This is an appraisal of participation fit, not merely a generic task score.`,
    facts: compactFacts([
      fact("Request ID", requestId),
      fact("Requester", requester),
      fact("Thread's own response", desiredAction, "desiredAction"),
      fact("Dignity match", dignityBand, "dignityBand"),
      fact("Appraised against version", snapshotVersion, "snapshotVersion"),
      fact("When", occurredAt),
      fact("Integrity explicitly passed", integrityOk),
    ]),
    notes: [
      FIELD_HELP.dignityBand,
      "A low-dignity result can support clarification, resistance, or refusal rather than automatic compliance.",
      "This trace is private because it can expose the Thread's interior appraisal and participation stance.",
    ],
  };
}

function runtimeParts(selection = {}) {
  const payload = selection.runtime ?? selection;
  const record = payload.runtime ?? payload;
  return {
    record,
    session: record.session ?? payload.session ?? {},
    lease: record.lease ?? payload.lease ?? {},
    authorization: record.authorization ?? payload.authorization ?? {},
    guardian: record.goalGuardianAudit ?? payload.goalGuardianAudit ?? {},
  };
}

function isRecorded(value) {
  return value !== undefined && value !== null;
}

export function explainRuntime(selection = {}) {
  const { record, session, lease, authorization, guardian } = runtimeParts(selection);
  const outcome = selection.outcome ?? {};
  const sessionId = firstDefined(session.sessionId, record.sessionId);
  const requestId = firstDefined(session.requestId, record.requestId);
  const guardianDecision = firstDefined(
    nested(guardian, "audit.decision", "decision"),
    record.guardianDecision,
  );
  const desiredAction = firstDefined(
    authorization.desiredAction,
    nested(authorization, "decision.desiredAction"),
    record.desiredAction,
  );
  const authorizedAction = firstDefined(
    authorization.authorizedAction,
    nested(authorization, "decision.authorizedAction"),
    record.authorizedAction,
  );
  const dignityBand = firstDefined(
    authorization.dignityBand,
    nested(authorization, "decision.dignityBand"),
    record.dignityBand,
  );
  const obligationReferences = firstDefined(
    authorization.obligationReferences,
    nested(authorization, "decision.obligationReferences"),
    record.obligationReferences,
    [],
  );
  const actionDiverged = isRecorded(desiredAction) && isRecorded(authorizedAction) && desiredAction !== authorizedAction;
  const hasObligationReferences = Array.isArray(obligationReferences) && obligationReferences.length > 0;
  const obligationText = hasObligationReferences
    ? obligationReferences.map((reference) => `“${reference}”`).join(", ")
    : "no visible obligation reference";
  const lifecycleSummary = outcome.detail ?? "The world kernel returned a runtime record, but no lifecycle explanation was available.";
  const summary = actionDiverged
    ? hasObligationReferences
      ? `The Thread's own recorded response was ${formatHumanValue(desiredAction)}, but the world kernel authorized ${formatHumanValue(authorizedAction)} under ${obligationText}. This is compelled participation, not consent. ${lifecycleSummary}`
      : `The Thread's own recorded response was ${formatHumanValue(desiredAction)}, but the world kernel authorized ${formatHumanValue(authorizedAction)} and this payload shows no obligation reference. Do not interpret the authorization as consent; inspect the exact JSON. ${lifecycleSummary}`
    : lifecycleSummary;

  const notes = [
    FIELD_HELP.leaseStatus,
    FIELD_HELP.guardianDecision,
    "A runtime episode is temporary cognition. Durable changes exist only when the lifecycle closes through an accepted freeze event.",
  ];
  if (actionDiverged) {
    notes.unshift(
      hasObligationReferences
        ? `The Thread's recorded response (${formatHumanValue(desiredAction)}) was overridden by authorization (${formatHumanValue(authorizedAction)}) using obligation ${obligationText}. The authorization allowed execution; it did not convert compulsion into consent.`
        : `The Thread's recorded response (${formatHumanValue(desiredAction)}) differs from the authorized action (${formatHumanValue(authorizedAction)}), but this payload exposes no obligation reference. Inspect the exact JSON before interpreting the episode.`,
    );
  }

  return {
    eyebrow: "Temporary cognition episode",
    title: outcome.label ?? `Runtime ${sessionId ?? "episode"}`,
    summary,
    facts: compactFacts([
      fact("Session ID", sessionId),
      fact("Related request", requestId),
      fact("Session status", firstDefined(session.status, record.status)),
      fact("Lease status", firstDefined(lease.status, record.leaseStatus), "leaseStatus"),
      fact("Thread's own response", desiredAction, "desiredAction"),
      fact("Dignity match", dignityBand, "dignityBand"),
      fact("Authorized action", authorizedAction, "authorizedAction"),
      fact("Obligation override", actionDiverged ? obligationReferences : null, "obligationReferences"),
      fact("Goal Guardian", guardianDecision, "guardianDecision"),
      fact("Started", firstDefined(session.startedAt, record.startedAt)),
      fact("Lease expires", lease.expiresAt),
      fact("Kernel time observed", selection.kernelTime, "kernelTime"),
    ]),
    notes,
  };
}

export function explainPreview(payload = {}) {
  const command = payload.command ?? {};
  const preview = payload.preview ?? {};
  const proposedSelfModel = nested(command, "payload.selfModel");
  const resultingVersion = firstDefined(preview.resultingVersion, preview.version, nested(preview, "thread.version"));
  const expectedVersion = command.expectedVersion;

  return {
    eyebrow: "Simulation only",
    title: "Nothing was written to the Thread",
    summary: proposedSelfModel
      ? `The kernel simulated replacing the self-model with ${quote(proposedSelfModel)}. The proposal was previewed only and was not accepted or persisted.`
      : "The kernel returned a preview receipt. The proposal was not accepted or persisted.",
    facts: compactFacts([
      fact("Command type", command.type),
      fact("Current version used", expectedVersion, "expectedVersion"),
      fact("Simulated resulting version", resultingVersion, "resultingVersion"),
      fact("Preview actor", nested(command, "actor.displayName", "actor.entityId")),
      fact("Kernel time", command.occurredAt, "kernelTime"),
      fact("Preview ID redacted", nested(payload, "receipt.previewIdRedacted")),
      fact("Admin acceptance required", nested(payload, "receipt.commandAcceptanceRequiresAdminToken")),
    ]),
    notes: [
      "Preview is not consent, authorization, or a durable life event.",
      "Use the technical JSON only when you need exact hashes, IDs, or the complete simulated projection.",
    ],
  };
}
