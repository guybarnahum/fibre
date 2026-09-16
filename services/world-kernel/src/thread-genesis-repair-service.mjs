const OPERATION_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,220}$/u;

function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") throw new TypeError(`${name} must expose ${method}()`);
  return value;
}

function text(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function currentCanonicalPortrait(embodimentStore, threadId) {
  const current = embodimentStore.listCurrent(threadId);
  return current.find((entry) => entry?.kind === "portrait" && entry?.visibility === "public") ?? null;
}

function presentationVisualState(snapshot, embodiment) {
  if (snapshot === null) return "missing";
  if (embodiment === null) return "not_applicable";
  const objectRef = embodiment.asset?.referenceObjectRef ?? null;
  const visualRefs = snapshot?.presentation?.visualIdentity?.referenceObjectRefs ?? [];
  const officialPhotoMediaRef = snapshot?.presentation?.identityCard?.officialPhotoMediaRef ?? null;
  const media = snapshot?.media?.assets ?? [];
  const projected = typeof objectRef === "string" && visualRefs.includes(objectRef);
  const published = projected
    && typeof officialPhotoMediaRef === "string"
    && media.some((asset) => asset?.mediaId === officialPhotoMediaRef && asset?.status === "ready" && typeof asset?.locator === "string");
  if (published) return "published";
  if (projected) return "projected";
  return "missing";
}

function finding(code, state, action = null, detail = {}) {
  return Object.freeze({ code, state, action, ...detail });
}

function overall(findings) {
  if (findings.some((entry) => entry.state === "unrecoverable")) return "unrecoverable";
  if (findings.some((entry) => entry.state === "integrity_error")) return "integrity_error";
  if (findings.some((entry) => entry.state === "operator_decision_required")) return "operator_decision_required";
  if (findings.some((entry) => entry.state === "migration_required")) return "migration_required";
  if (findings.some((entry) => entry.state === "repairable")) return "repairable";
  return "healthy";
}

function identityFinding({ code, missingCode, authoritative, projected = undefined, projectionCode = null, conflictCode = null }) {
  const source = text(authoritative);
  if (source === null) return finding(missingCode, "migration_required");
  if (projected === undefined) return finding(code, "healthy", null, { authoritative:source });

  const publicValue = text(projected);
  if (publicValue === null) {
    return finding(projectionCode ?? `${code}_PRESENTATION_MISSING`, "operator_decision_required", null, {
      authoritative:source,
      presentation:null,
      reason:"authoritative fact exists but current Presentation omits it",
    });
  }
  if (publicValue !== source) {
    return finding(conflictCode ?? `${code}_CONFLICT`, "integrity_error", null, {
      authoritative:source,
      presentation:publicValue,
    });
  }
  return finding(code, "healthy", null, { authoritative:source, presentation:publicValue });
}

function identityCompleteness(thread, registration, presentation, sexEvidence) {
  const identity = thread.identity ?? {};
  const projected = presentation?.presentation ?? null;
  const missingSex = text(identity.sex) === null;
  const sexFinding = missingSex
    ? sexEvidence === null
      ? finding("SEX_MISSING", "migration_required", null, {
        evidenceAvailable:false,
        reason:"preserved Genesis birth evidence does not explicitly record sex",
      })
      : finding("SEX_MISSING", "migration_required", null, {
        evidenceAvailable:true,
        source:sexEvidence.source,
        genesisId:sexEvidence.genesisId,
        sex:sexEvidence.sex,
        migration:Object.freeze({ id:"genesis_sex_v1", label:"Genesis sex", input:null }),
      })
    : finding("SEX", "healthy", null, { authoritative:text(identity.sex) });

  const findings = [
    identityFinding({
      code:"CIVIL_IDENTITY",
      missingCode:"FIN_MISSING",
      authoritative:registration?.fibreIdentityNumber,
      projected:projected === null ? undefined : projected.civilIdentity?.fibreIdentityNumber ?? null,
      projectionCode:"FIN_PRESENTATION_MISSING",
      conflictCode:"FIN_CONFLICT",
    }),
    identityFinding({
      code:"NAME",
      missingCode:"NAME_MISSING",
      authoritative:identity.name,
      projected:projected === null ? undefined : projected.subject?.displayName ?? null,
      projectionCode:"NAME_PRESENTATION_MISSING",
      conflictCode:"NAME_CONFLICT",
    }),
    sexFinding,
  ];

  const canonicalSpec = identity.canonicalVisualIdentity?.specification ?? null;
  findings.push(canonicalSpec
    ? finding("CANONICAL_VISUAL_SPEC", "healthy")
    : finding("CANONICAL_VISUAL_SPEC_MISSING", "migration_required"));

  const originOrientation = text(identity.originOrientation);
  findings.push(originOrientation === null
    ? finding("ORIGIN_ORIENTATION_MISSING", "migration_required")
    : finding("ORIGIN_ORIENTATION", "healthy", null, { authoritative:originOrientation }));

  const birthDate = text(identity.birthDate);
  if (birthDate !== null) {
    const publicBirthDate = projected === null ? undefined : projected.subject?.birthDate ?? null;
    findings.push(identityFinding({
      code:"BIRTH_DATE",
      missingCode:"BIRTH_DATE_MISSING",
      authoritative:birthDate,
      projected:publicBirthDate,
      projectionCode:"BIRTH_DATE_PRESENTATION_MISSING",
      conflictCode:"BIRTH_DATE_CONFLICT",
    }));
  }

  return Object.freeze({
    facts:Object.freeze({
      name:text(identity.name),
      sex:text(identity.sex),
      fibreIdentityNumber:text(registration?.fibreIdentityNumber),
      originOrientation,
      birthDate,
      canonicalVisualSpecification:canonicalSpec === null ? "missing" : "present",
    }),
    findings:Object.freeze(findings),
  });
}

function optionalActivity(value) {
  if (value === null || value === undefined) return null;
  if (typeof value.record !== "function") throw new TypeError("repair activity recorder must expose record()");
  return value;
}

async function record(activity, entry) {
  if (activity === null) return;
  try { await activity.record(entry); } catch {}
}

function operationKey(name, value) {
  if (typeof value !== "string" || !OPERATION_KEY.test(value)) throw new TypeError(`${name} must be a Fibre identifier up to 221 characters`);
  return value;
}

function childOperation(root, child) {
  return `${root}.${child}`;
}

function migrationInput(value) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("migration input must be an object or null");
  return value;
}

export function createThreadGenesisRepairService({
  worldReader,
  civilRegistry,
  embodimentReader,
  presentationReader,
  presentationDelivery,
  visualReconciler,
  genesisSexEvidence,
  genesisSexMigrator,
  activityRecorder = null,
} = {}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("civilRegistry", civilRegistry, "getCivilRegistrationByThreadId");
  requireMethod("embodimentReader", embodimentReader, "listCurrent");
  if (!presentationReader || typeof presentationReader.getSnapshot !== "function") {
    throw new TypeError("presentationReader must expose getSnapshot()");
  }
  requireMethod("presentationDelivery", presentationDelivery, "rebuildThreadPresentation");
  requireMethod("visualReconciler", visualReconciler, "reconcileThread");
  requireMethod("genesisSexEvidence", genesisSexEvidence, "resolve");
  requireMethod("genesisSexMigrator", genesisSexMigrator, "migrate");
  const activity = optionalActivity(activityRecorder);

  async function diagnose(threadId) {
    const thread = worldReader.getThread(threadId, { required:false });
    if (thread === null) return Object.freeze({ threadId, health:"unrecoverable", exists:false, identity:null, findings:Object.freeze([
      finding("THREAD_NOT_FOUND", "unrecoverable"),
    ]) });

    const registration = civilRegistry.getCivilRegistrationByThreadId(threadId, { required:false });
    const embodiment = currentCanonicalPortrait(embodimentReader, threadId);
    const presentation = await presentationReader.getSnapshot(threadId);
    const sexEvidence = text(thread.identity?.sex) === null ? genesisSexEvidence.resolve(threadId) : null;
    const visualState = presentationVisualState(presentation, embodiment);
    const completeness = identityCompleteness(thread, registration, presentation, sexEvidence);
    const findings = [...completeness.findings];

    const canonicalSpec = thread.identity?.canonicalVisualIdentity?.specification ?? null;
    if (embodiment === null) {
      findings.push(canonicalSpec
        ? finding("CANONICAL_EMBODIMENT_MISSING", "repairable", "reconcile_visual_publication")
        : finding("CANONICAL_EMBODIMENT_MISSING", "migration_required"));
    } else if (embodiment.status === "available" && embodiment.asset?.referenceObjectRef) {
      findings.push(finding("CANONICAL_EMBODIMENT", "healthy", null, {
        embodimentId: embodiment.embodimentId,
        objectRef: embodiment.asset.referenceObjectRef,
      }));
    } else {
      findings.push(finding("CANONICAL_EMBODIMENT_PENDING", "repairable", "reconcile_visual_publication", {
        embodimentId: embodiment.embodimentId,
        embodimentStatus: embodiment.status ?? null,
      }));
    }

    findings.push(presentation === null
      ? finding("PRESENTATION_MISSING", "repairable", "rebuild_presentation")
      : finding("PRESENTATION", "healthy"));

    if (embodiment !== null && embodiment.status === "available") {
      findings.push(visualState === "published"
        ? finding("CANONICAL_VISUAL_PUBLICATION", "healthy")
        : finding("CANONICAL_VISUAL_NOT_PUBLISHED", "repairable", "reconcile_visual_publication", { visualState }));
    }

    return Object.freeze({
      threadId,
      health: overall(findings),
      exists: true,
      identity:completeness.facts,
      findings: Object.freeze(findings),
    });
  }

  async function migrate(threadId, { migrationId, migrationKey, input = null } = {}) {
    const root = operationKey("migrationKey", migrationKey);
    if (migrationId !== "genesis_sex_v1") throw new TypeError("unsupported Thread migration");
    const suppliedInput = migrationInput(input);
    if (suppliedInput !== null && Object.keys(suppliedInput).length !== 0) {
      throw new TypeError("genesis_sex_v1 does not accept operator input");
    }

    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, migrationId, migrationKey:root, before, after:before, migrated:false });
    const available = before.findings.some((entry) => entry.migration?.id === migrationId);
    if (!available) throw new TypeError(`migration ${migrationId} is not available for Thread ${threadId}`);

    await record(activity, {
      threadId,
      operationId:root,
      stage:"thread.migration.start",
      status:"succeeded",
      attempt:1,
      evidence:{ migrationId },
    });

    const thread = worldReader.getThread(threadId);
    const evidence = genesisSexEvidence.resolve(threadId);
    if (evidence === null) throw new Error(`Thread ${threadId} no longer has authoritative Genesis sex evidence`);
    const result = genesisSexMigrator.migrate(thread, { evidence });
    await record(activity, {
      threadId,
      operationId:childOperation(root, "genesis_sex"),
      parentOperationId:root,
      stage:"thread.migration.genesis_sex",
      status:"succeeded",
      attempt:1,
      evidence:{ migrationId, eventId:result.eventId, genesisId:evidence.genesisId, migrated:result.migrated === true },
    });

    const after = await diagnose(threadId);
    await record(activity, {
      threadId,
      operationId:childOperation(root, "complete"),
      parentOperationId:root,
      stage:"thread.migration.complete",
      status:"succeeded",
      attempt:1,
      evidence:{ migrationId, health:after.health },
    });
    return Object.freeze({ threadId, migrationId, migrationKey:root, before, after, migrated:result.migrated === true, result });
  }

  async function repair(threadId, { repairKey } = {}) {
    const root = operationKey("repairKey", repairKey);
    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, repairKey:root, before, after:before, actions:Object.freeze([]) });

    const migrationBlocked = before.findings.some((entry) => entry.state === "migration_required");
    const actionable = before.findings.filter((entry) => entry.state === "repairable" && entry.action !== null).map((entry) => entry.code);
    await record(activity, {
      threadId,
      operationId:root,
      stage:"thread.repair.start",
      status:"succeeded",
      attempt:1,
      evidence:{ findingCodes:actionable, migrationBlocked },
    });

    const actions = [];
    if (!migrationBlocked && before.findings.some((entry) => entry.action === "rebuild_presentation")) {
      const result = await presentationDelivery.rebuildThreadPresentation(threadId);
      actions.push(Object.freeze({ action:"rebuild_presentation", result }));
      await record(activity, {
        threadId,
        operationId:childOperation(root, "presentation"),
        parentOperationId:root,
        stage:"thread.repair.presentation_rebuild",
        status:"succeeded",
        attempt:1,
        evidence:{ genesisId:result.genesisId, rebuilt:result.rebuilt === true },
      });
    }

    const afterPresentation = await diagnose(threadId);
    if (!migrationBlocked && afterPresentation.findings.some((entry) => entry.action === "reconcile_visual_publication")) {
      const result = await visualReconciler.reconcileThread({
        threadId,
        regenerationKey: root,
        activityContext: { repairKey:root, parentOperationId:childOperation(root, "visual") },
      });
      actions.push(Object.freeze({ action:"reconcile_visual_publication", result }));
      await record(activity, {
        threadId,
        operationId:childOperation(root, "visual"),
        parentOperationId:root,
        stage:"thread.repair.visual_reconcile",
        status:"succeeded",
        attempt:1,
        evidence:{ stage:result.stage, complete:result.complete === true },
      });
    }

    const after = await diagnose(threadId);
    await record(activity, {
      threadId,
      operationId:childOperation(root, "complete"),
      parentOperationId:root,
      stage:"thread.repair.complete",
      status:"succeeded",
      attempt:1,
      evidence:{ health:after.health, remaining:after.findings.filter((entry) => entry.state !== "healthy").map((entry) => entry.code) },
    });
    return Object.freeze({
      threadId,
      repairKey:root,
      before,
      after,
      actions:Object.freeze(actions),
    });
  }

  return Object.freeze({ diagnose, migrate, repair });
}
