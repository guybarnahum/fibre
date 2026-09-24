import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { decorateActionButton, iconForIdentityAction } from "./fa-icons.js";

const dialogBody = document.querySelector("#dialog-body");

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function human(value) {
  return String(value ?? "").replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

function announceThreadUpdated(threadId, change) {
  window.dispatchEvent(new CustomEvent("fibre:thread-updated", {
    detail:{ threadId, change },
  }));
}

function labelFor(code) {
  const labels = {
    THREAD_NOT_FOUND:"World admission",
    CIVIL_IDENTITY:"Civil identity",
    FIN_MISSING:"Civil identity",
    FIN_PRESENTATION_MISSING:"Civil identity",
    FIN_CONFLICT:"Civil identity",
    NAME:"Name",
    NAME_UNFINISHED:"Name",
    NAME_MISSING:"Name",
    NAME_PRESENTATION_MISSING:"Name",
    NAME_PRESENTATION_STALE:"Name",
    NAME_CONFLICT:"Name",
    SEX:"Sex",
    SEX_MISSING:"Sex",
    CANONICAL_VISUAL_SPEC:"Canonical visual identity",
    CANONICAL_VISUAL_SPEC_MISSING:"Canonical visual identity",
    ORIGIN_ORIENTATION:"Origin orientation",
    ORIGIN_ORIENTATION_MISSING:"Origin orientation",
    BIRTH_DATE:"Birth date",
    BIRTH_DATE_MISSING:"Birth date",
    BIRTH_DATE_PRESENTATION_MISSING:"Birth date",
    BIRTH_DATE_CONFLICT:"Birth date",
    SPOKEN_LANGUAGES:"Spoken languages",
    SPOKEN_LANGUAGES_PRESENTATION_STALE:"Spoken languages",
    RAISED_LANGUAGES:"Raised languages",
    RAISED_LANGUAGES_MISSING:"Raised languages",
    RAISED_LANGUAGES_NEED_REVIEW:"Raised languages",
    CANONICAL_EMBODIMENT:"Canonical embodiment",
    CANONICAL_EMBODIMENT_MISSING:"Canonical embodiment",
    CANONICAL_EMBODIMENT_PENDING:"Canonical embodiment",
    PRESENTATION:"Presentation",
    PRESENTATION_MISSING:"Presentation",
    CANONICAL_VISUAL_PUBLICATION:"Canonical portrait",
    CANONICAL_VISUAL_NOT_PUBLISHED:"Canonical portrait",
  };
  return labels[code] ?? human(code);
}

function stateText(finding) {
  if (finding.state === "healthy") return "healthy";
  if (finding.state === "repairable") return "repairable";
  if (finding.migration?.id) return `migration · ${finding.migration.label ?? human(finding.migration.id)}`;
  if (finding.state === "migration_required") return "migration required";
  if (finding.state === "operator_decision_required" && ["admit_name","admit_birth_date"].includes(finding.identityAction?.id)) return "admission required";
  if (finding.code === "RAISED_LANGUAGES_NEED_REVIEW") return "review required";
  if (finding.state === "operator_decision_required") return "input required";
  if (finding.state === "integrity_error") return "authority conflict";
  if (finding.state === "unrecoverable") return "not admitted";
  return human(finding.state);
}

function tone(state) {
  if (["healthy","complete"].includes(state)) return "good";
  if (["integrity_error","unrecoverable","dead_letter"].includes(state)) return "bad";
  return "warn";
}

function explanation(finding) {
  return [
    `${labelFor(finding.code)}: ${stateText(finding)}`,
    finding.reason,
    finding.authoritative ? `World: ${finding.authoritative}` : null,
    finding.presentation ? `Presentation: ${finding.presentation}` : null,
  ].filter(Boolean).join(" · ");
}

function healthTag(finding) {
  const kind = tone(finding.state);
  const icon = kind === "good" ? "✓" : kind === "bad" ? "×" : "!";
  const suffix = finding.state === "healthy" ? "" : ` · ${stateText(finding)}`;
  const tag = el("span", `thread-health-tag ${kind}`, `${icon} ${labelFor(finding.code)}${suffix}`);
  tag.title = explanation(finding);
  return tag;
}

function reconciliationTag(reconciliation) {
  if (reconciliation === null) return null;
  const kind = tone(reconciliation.state);
  const icon = kind === "good" ? "✓" : kind === "bad" ? "×" : "!";
  const detail = reconciliation.state === "dead_letter"
    ? `dead letter${reconciliation.lastError?.code ? ` · ${human(reconciliation.lastError.code)}` : ""}`
    : human(reconciliation.state);
  const tag = el("span", `thread-health-tag ${kind}`, `${icon} Reconciliation · ${detail}`);
  tag.title = reconciliation.lastError?.message ?? detail;
  return tag;
}

function actionable(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => finding?.state === "repairable" && typeof finding?.action === "string" && finding.action !== "");
}

function migrations(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => typeof finding?.migration?.id === "string");
}

function identityActions(diagnosis) {
  const seen = new Set();
  return (diagnosis?.findings ?? []).flatMap((finding) => {
    const action = finding?.identityAction;
    if (!action?.id || seen.has(action.id)) return [];
    seen.add(action.id);
    return [action];
  });
}
function operatorDecisionFindings(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => finding?.state === "operator_decision_required");
}

function operatorDecisionActionIds(diagnosis) {
  return new Set(operatorDecisionFindings(diagnosis)
    .map((finding) => finding?.identityAction?.id)
    .filter((value) => typeof value === "string" && value !== ""));
}

function readableFindingValue(value) {
  if (Array.isArray(value)) return value.length === 0 ? "None" : value.join(" · ");
  if (value === null || value === undefined || value === "") return "None";
  return String(value);
}

function renderOperatorDecisionGuidance(host, diagnosis) {
  const findings = operatorDecisionFindings(diagnosis);
  if (findings.length === 0) return;

  const panel = el("div", "thread-operator-decisions");
  panel.append(el("strong", null, findings.length === 1 ? "Operator decision required" : "Operator decisions required"));
  for (const finding of findings) {
    const item = el("div", "thread-operator-decision");
    const action = finding.identityAction;
    const title = el("span", "thread-operator-decision-title", labelFor(finding.code));
    const actionLabel = action?.label ?? null;
    const summary = el("p", null, [
      finding.reason ?? `${labelFor(finding.code)} requires explicit operator input.`,
      finding.authoritative !== undefined ? `Current World: ${readableFindingValue(finding.authoritative)}.` : null,
      actionLabel ? `Required action: ${actionLabel}.` : null,
    ].filter(Boolean).join(" "));
    item.append(title, summary);
    panel.append(item);
  }
  host.append(panel);
}

function unresolved(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => finding?.state !== "healthy");
}

async function requestHealth(threadId) {
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    headers:{ Accept:"application/json" },
    cache:"no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok && !(response.status === 404 && payload?.diagnosis)) {
    throw new Error(payload?.error?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  }
  return Object.freeze({ diagnosis:payload.diagnosis, reconciliation:payload.reconciliation ?? null });
}

async function post(threadId, body) {
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    method:"POST",
    headers:{ "content-type":"application/json", Accept:"application/json" },
    body:JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error?.code ?? payload?.error ?? `HTTP ${response.status}`);
  return payload;
}

function actionButton(label, run, { icon = null, tooltip = label } = {}) {
  const button = el("button", "secondary thread-repair-button");
  button.type = "button";
  decorateActionButton(button, { icon, label, tooltip });
  button.addEventListener("click", async () => {
    try {
      button.disabled = true;
      decorateActionButton(button, { icon, label:`${label}…`, tooltip });
      await run();
    } catch (error) {
      button.disabled = false;
      decorateActionButton(button, { icon, label, tooltip });
      button.parentElement?.after(el("div", "error-box", error instanceof Error ? error.message : String(error)));
    }
  });
  return button;
}

function dialogActionButton(label, open, { icon = null, tooltip = label } = {}) {
  const button = el("button", "secondary thread-repair-button");
  button.type = "button";
  decorateActionButton(button, { icon, label, tooltip });
  button.addEventListener("click", open);
  return button;
}

function renderIdentityActions(host, threadId, diagnosis, reconciliation) {
  const actions = identityActions(diagnosis);
  if (actions.length === 0) return;
  const required = operatorDecisionActionIds(diagnosis);
  const bar = el("div", "thread-repair-actions");
  for (const action of actions) {
    const label = action.label ?? human(action.id);
    const description = action.id === "admit_name"
      ? "Admit the preserved public name into authoritative World identity. This is an explicit operator decision; Presentation is evidence, not authority."
      : action.id === "admit_birth_date"
        ? "Admit the preserved birth date into authoritative World identity. This is an explicit operator decision; Presentation is evidence, not authority."
        : ["set_raised_languages","change_raised_languages"].includes(action.id)
          ? "Correct the languages this person was raised with in Genesis. This does not edit Spoken languages, which belong to the Thread's lived history."
          : "Record an explicit operator identity decision in World history.";
    const control = dialogActionButton(label, () => {
      openThreadActionDialog({
        threadId,
        threadName:diagnosis.identity?.name ?? null,
        label,
        eyebrow:"Authoritative identity",
        description,
        fields:actionFields(action),
        run:async (input) => {
          await post(threadId, {
            action:action.command ?? "identity",
            operationKey:`${action.command === "raised_languages" ? "admin_raised_languages" : "admin_identity"}_${Date.now().toString(36)}`,
            ...input,
          });
          window.dispatchEvent(new CustomEvent("fibre:thread-identity-updated", {
            detail:{ threadId, actionId:action.id },
          }));
          renderHealth(
            host,
            threadId,
            await requestHealth(threadId),
            action.id === "admit_name"
              ? "Name admitted into World; Presentation is reconciled from that authority."
              : action.id === "admit_birth_date"
                ? "Birth date admitted into World; Presentation is reconciled from that authority."
                : action.command === "raised_languages"
                  ? "Raised languages corrected in Genesis; Spoken languages were left untouched."
                  : `${label} updated in World.`,
          );
        },
      });
    }, {
      icon:iconForIdentityAction(action.id),
      tooltip:`${label} — ${description}`,
    });
    if (required.has(action.id)) control.className = "primary thread-repair-button thread-required-action";
    bar.append(control);
  }
  host.append(bar);
}

function renderMigrationActions(host, threadId, diagnosis, reconciliation) {
  const available = migrations(diagnosis);
  if (available.length === 0) return;
  const bar = el("div", "thread-repair-actions");
  for (const finding of available) {
    const migration = finding.migration;
    const label = `Migrate · ${migration.label ?? human(migration.id)}`;
    bar.append(dialogActionButton(label, () => {
      openThreadActionDialog({
        threadId,
        threadName:diagnosis.identity?.name ?? null,
        label,
        eyebrow:"Identity migration",
        description:"Apply the named migration using preserved evidence, then re-diagnose authoritative World state.",
        fields:actionFields(migration),
        run:async (input) => {
          const payload = await post(threadId, {
            action:"migrate",
            migrationId:migration.id,
            migrationKey:`admin_migration_${Date.now().toString(36)}`,
            input,
          });
          renderHealth(host, threadId, {
            diagnosis:payload.migration.after,
            reconciliation:payload.reconciliation ?? reconciliation,
          }, `Migration complete · ${migration.label ?? human(migration.id)}.`);
          announceThreadUpdated(threadId, "migration");
        },
      });
    }, {
      icon:"arrow-up-from-bracket",
      tooltip:`${label} — Apply preserved Genesis evidence to authoritative World identity.`,
    }));
  }
  host.append(bar);
}

function renderRepairAction(host, threadId, diagnosis, reconciliation) {
  const actions = actionable(diagnosis);
  if (actions.length === 0 || diagnosis.health !== "repairable") return;
  const label = reconciliation?.state === "dead_letter" ? "Fix & Recover" : "Fix";
  const bar = el("div", "thread-repair-actions");
  const button = actionButton(label, async () => {
    const payload = await post(threadId, { repairKey:`admin_repair_${Date.now().toString(36)}` });
    const names = (payload.result.actions ?? []).map((entry) => human(entry.action)).join(" · ");
    renderHealth(host, threadId, {
      diagnosis:payload.result.after,
      reconciliation:payload.reconciliation ?? null,
    }, names ? `Applied: ${names}` : "No repair action was required.");
    announceThreadUpdated(threadId, "repair");
  }, {
    icon:reconciliation?.state === "dead_letter" ? "heart-pulse" : "wrench",
    tooltip:reconciliation?.state === "dead_letter"
      ? "Fix & Recover — repair derived state from World authority and return this Thread from quarantine."
      : "Fix — repair derived state from authoritative World facts.",
  });
  button.className = "primary thread-repair-button";
  bar.append(button);
  host.append(bar);
}

function renderPendingReconciliationAction(host, threadId, diagnosis, reconciliation) {
  if (reconciliation?.state !== "pending" || diagnosis.health !== "healthy") return;
  const bar = el("div", "thread-repair-actions");
  const button = actionButton("Resolve reconciliation", async () => {
    const payload = await post(threadId, { repairKey:`admin_reconcile_${Date.now().toString(36)}` });
    renderHealth(host, threadId, {
      diagnosis:payload.result.after,
      reconciliation:payload.reconciliation ?? null,
    }, "Reconciliation state resolved from current authoritative health.");
    announceThreadUpdated(threadId, "reconciliation");
  }, {
    icon:"rotate",
    tooltip:"Resolve reconciliation — retire stale pending reconciliation after authoritative health is verified.",
  });
  button.className = "primary thread-repair-button";
  bar.append(button);
  host.append(bar);
}

function renderRecoveryAction(host, threadId, diagnosis, reconciliation) {
  if (reconciliation?.state !== "dead_letter" || unresolved(diagnosis).length !== 0) return;
  const bar = el("div", "thread-repair-actions");
  const button = actionButton("Recover", async () => {
    const payload = await post(threadId, { action:"recover" });
    renderHealth(host, threadId, {
      diagnosis,
      reconciliation:payload.recovery.after,
    }, "Recovered · reconciliation is pending.");
    announceThreadUpdated(threadId, "recovery");
  }, {
    icon:"heart-pulse",
    tooltip:"Recover — return this healthy Thread from dead-letter quarantine to reconciliation processing.",
  });
  button.className = "primary thread-repair-button";
  bar.append(button);
  host.append(bar);
}

function renderHealthRefresh(host, threadId) {
  const bar = el("div", "thread-repair-actions");
  bar.append(actionButton("Refresh health", () => renderThreadHealth(host, threadId)));
  host.append(bar);
}

function renderHealth(host, threadId, health, message = null) {
  const { diagnosis, reconciliation } = health;
  host.replaceChildren();
  const head = el("div", "thread-person-section-head");
  head.append(el("h3", null, "Thread health"), el("span", null, human(diagnosis.health)));
  host.append(head);

  const tags = el("div", "thread-health-tags");
  const work = reconciliationTag(reconciliation);
  if (work) tags.append(work);
  for (const finding of diagnosis.findings ?? []) tags.append(healthTag(finding));
  host.append(tags);
  if (message) host.append(el("p", "thread-repair-message", message));
  renderOperatorDecisionGuidance(host, diagnosis);

  if (diagnosis.exists === false) {
    host.append(el("p", "thread-repair-note", "Activity observed this identifier, but World never admitted it as a Thread. There is no person state to repair or recover."));
    renderHealthRefresh(host, threadId);
    return;
  }

  renderIdentityActions(host, threadId, diagnosis, reconciliation);
  renderMigrationActions(host, threadId, diagnosis, reconciliation);
  renderRepairAction(host, threadId, diagnosis, reconciliation);
  renderPendingReconciliationAction(host, threadId, diagnosis, reconciliation);
  renderRecoveryAction(host, threadId, diagnosis, reconciliation);

  if (reconciliation?.state === "dead_letter" && unresolved(diagnosis).length > 0) {
    host.append(el("p", "thread-repair-note", "Quarantined until the identity or authority findings above are resolved."));
  }
  renderHealthRefresh(host, threadId);
}

export async function renderThreadHealth(host, threadId, message = null) {
  host.replaceChildren(el("div", "thread-loading", "Checking Thread health…"));
  try {
    renderHealth(host, threadId, await requestHealth(threadId), message);
  } catch (error) {
    host.replaceChildren(el("div", "error-box", `Thread diagnosis unavailable: ${error instanceof Error ? error.message : String(error)}`));
  }
}

function attach() {
  const view = dialogBody?.querySelector(".thread-person-view");
  const idNode = view?.querySelector(".thread-person-id");
  const threadId = idNode?.textContent?.trim();
  if (!view || !/^thr_[A-Za-z0-9._:-]+$/u.test(threadId ?? "")) return;
  if (view.querySelector(".thread-repair-section")) return;

  const host = el("section", "thread-person-section thread-repair-section");
  const head = el("div", "thread-person-section-head");
  head.append(el("h3", null, "Thread health"), el("span", null, "not checked"));
  const actions = el("div", "thread-repair-actions");
  actions.append(actionButton("Check health", () => renderThreadHealth(host, threadId)));
  host.append(head, actions);
  view.querySelector(".thread-person-hero")?.after(host);
}

if (dialogBody) {
  new MutationObserver(attach).observe(dialogBody, { childList:true, subtree:true });
}
