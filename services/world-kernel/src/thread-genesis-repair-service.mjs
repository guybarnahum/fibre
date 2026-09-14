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

function identityCompleteness(thread, registration, presentation) {
  const identity = thread.identity ?? {};
  const projected = presentation?.presentation ?? null;
  const findings = [
    identityFinding({
      code:"CIVIL_IDENTITY",
      missingCode:"FIN_MISSING",
      authoritative:registration?.fibreIdentityNumber,
      projected:projected === null ? undefined : projected.civilIdentity?.fibreIdentityNumber,
      projectionCode:"FIN_PRESENTATION_MISSING",
      conflictCode:"FIN_CONFLICT",
    }),
    identityFinding({
      code:"NAME",
      missingCode:"NAME_MISSING",
      authoritative:identity.name,
      projected:projected === null ? undefined : projected.subject?.displayName,
      projectionCode:"NAME_PRESENTATION_MISSING",
      conflictCode:"NAME_CONFLICT",
    }),
    identityFinding({ code:"SEX", missingCode:"SEX_MISSING", authoritative:identity.sex }),
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
    const publicBirthDate = projected === null ? undefined : projected.subject?.birthDate;
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

export function createThreadGenesisRepairService({
  worldReader,
  civilRegistry,
  embodimentReader,
  presentationReader,
  presentationDelivery,
  visualReconciler,
} = {}) {
  requireMethod("worldReader", worldReader, "getThread");
  requireMethod("civilRegistry", civilRegistry, "getCivilRegistrationByThreadId");
  requireMethod("embodimentReader", embodimentReader, "listCurrent");
  if (!presentationReader || typeof presentationReader.getSnapshot !== "function") {
    throw new TypeError("presentationReader must expose getSnapshot()");
  }
  requireMethod("presentationDelivery", presentationDelivery, "rebuildThreadPresentation");
  requireMethod("visualReconciler", visualReconciler, "reconcileThread");

  async function diagnose(threadId) {
    const thread = worldReader.getThread(threadId, { required:false });
    if (thread === null) return Object.freeze({ threadId, health:"unrecoverable", exists:false, identity:null, findings:Object.freeze([
      finding("THREAD_NOT_FOUND", "unrecoverable"),
    ]) });

    const registration = civilRegistry.getCivilRegistrationByThreadId(threadId, { required:false });
    const embodiment = currentCanonicalPortrait(embodimentReader, threadId);
    const presentation = await presentationReader.getSnapshot(threadId);
    const visualState = presentationVisualState(presentation, embodiment);
    const completeness = identityCompleteness(thread, registration, presentation);
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

  async function repair(threadId, { repairKey } = {}) {
    if (typeof repairKey !== "string" || repairKey.trim() === "") throw new TypeError("repairKey is required");
    const before = await diagnose(threadId);
    if (!before.exists) return Object.freeze({ threadId, repairKey, before, after:before, actions:Object.freeze([]) });

    const actions = [];
    if (before.findings.some((entry) => entry.action === "rebuild_presentation")) {
      const result = await presentationDelivery.rebuildThreadPresentation(threadId);
      actions.push(Object.freeze({ action:"rebuild_presentation", result }));
    }

    const afterPresentation = await diagnose(threadId);
    if (afterPresentation.findings.some((entry) => entry.action === "reconcile_visual_publication")) {
      const result = await visualReconciler.reconcileThread({
        threadId,
        regenerationKey: repairKey,
        activityContext: { repairKey },
      });
      actions.push(Object.freeze({ action:"reconcile_visual_publication", result }));
    }

    const after = await diagnose(threadId);
    return Object.freeze({
      threadId,
      repairKey,
      before,
      after,
      actions:Object.freeze(actions),
    });
  }

  return Object.freeze({ diagnose, repair });
}
