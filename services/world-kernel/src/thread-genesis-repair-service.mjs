function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") throw new TypeError(`${name} must expose ${method}()`);
  return value;
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
  const media = snapshot?.media?.assets ?? [];
  const projected = typeof objectRef === "string" && visualRefs.includes(objectRef);
  const published = typeof objectRef === "string" && media.some((asset) => (
    asset?.status === "ready" && asset?.locator === objectRef
  ));
  if (published) return "published";
  if (projected) return "projected";
  return "missing";
}

function finding(code, state, action = null, detail = {}) {
  return Object.freeze({ code, state, action, ...detail });
}

function overall(findings) {
  if (findings.some((entry) => entry.state === "unrecoverable")) return "unrecoverable";
  if (findings.some((entry) => entry.state === "operator_decision_required")) return "operator_decision_required";
  if (findings.some((entry) => entry.state === "migration_required")) return "migration_required";
  if (findings.some((entry) => entry.state === "repairable")) return "repairable";
  return "healthy";
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
    if (thread === null) return Object.freeze({ threadId, health:"unrecoverable", exists:false, findings:Object.freeze([
      finding("THREAD_NOT_FOUND", "unrecoverable"),
    ]) });

    const registration = civilRegistry.getCivilRegistrationByThreadId(threadId, { required:false });
    const embodiment = currentCanonicalPortrait(embodimentReader, threadId);
    const presentation = await presentationReader.getSnapshot(threadId);
    const visualState = presentationVisualState(presentation, embodiment);
    const findings = [];

    findings.push(registration?.fibreIdentityNumber
      ? finding("CIVIL_IDENTITY", "healthy")
      : finding("FIN_MISSING", "migration_required"));

    findings.push(thread.identity?.name
      ? finding("NAME", "healthy")
      : finding("NAME_MISSING", "migration_required"));

    findings.push(thread.identity?.sex
      ? finding("SEX", "healthy")
      : finding("SEX_MISSING", "migration_required"));

    const canonicalSpec = thread.identity?.canonicalVisualIdentity?.specification ?? null;
    findings.push(canonicalSpec
      ? finding("CANONICAL_VISUAL_SPEC", "healthy")
      : finding("CANONICAL_VISUAL_SPEC_MISSING", "migration_required"));

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
