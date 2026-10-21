import { threadAppearanceSection } from "./thread-appearance-ui.js";
import { decorateActionButton, setBlockingButtonState, setWaitingContent } from "./fa-icons.js";
import {createThreadEditButton} from "./thread-edit-menu.js";

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
    PHYSICAL_GENOME:"Appearance model",
    PHYSICAL_APPEARANCE_MODEL_OUTDATED:"Appearance model",
    LEGACY_PHYSICAL_EMBODIMENT:"Appearance model",
    CANONICAL_VISUAL_MODEL_OUTDATED:"Visual model",
    CANONICAL_VISUAL_SPEC:"Canonical visual identity",
    CANONICAL_VISUAL_SPEC_MISSING:"Canonical visual identity",
    ORIGIN_ORIENTATION:"Origin orientation",
    ORIGIN_ORIENTATION_MISSING:"Origin orientation",
    BIRTH_DATE:"Birth date",
    BIRTH_DATE_MISSING:"Birth date",
    BIRTH_DATE_PRESENTATION_MISSING:"Birth date",
    BIRTH_DATE_CONFLICT:"Birth date",
    BIRTH_GEOGRAPHY_RECOVERABLE:"Birth place",
    BIRTH_PLACE_MISSING:"Birth city",
    BIRTH_PLACE:"Birth city",
    BIRTH_COUNTRY_CODE_MISSING:"Birth country code",
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

function operatorDecisionFindings(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => finding?.state === "operator_decision_required");
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

function actionButton(label, run, { icon = null, tooltip = label, blocking = false } = {}) {
  const button = el("button", "secondary thread-repair-button");
  button.type = "button";
  decorateActionButton(button, { icon, label, tooltip });
  button.addEventListener("click", async () => {
    try {
      if (blocking) {
        setBlockingButtonState(button,true,{
          label,
          tooltip,
          icon,
          busyLabel:label,
          busyTooltip:label+"…",
        });
      } else {
        button.disabled = true;
        decorateActionButton(button, { icon, label:`${label}…`, tooltip });
      }
      await run();
    } catch (error) {
      if (blocking) setBlockingButtonState(button,false,{ label, tooltip, icon });
      else {
        button.disabled = false;
        decorateActionButton(button, { icon, label, tooltip });
      }
      button.parentElement?.after(el("div", "error-box", error instanceof Error ? error.message : String(error)));
    }
  });
  return button;
}

function renderHealthRefresh(host, threadId) {
  const bar = el("div", "thread-repair-actions");
  bar.append(actionButton("Refresh health", () => renderThreadHealth(host, threadId), { blocking:true }));
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

  // Thread Observatory already has the same Edit control in its header.
  // The compact Thread popup has no header, so retain its local entry point.
  if(!host.closest(".thread-observatory-page")){
    const edits=el("div","thread-repair-actions");
    edits.append(createThreadEditButton({threadId,name:diagnosis.identity?.name??null,
      onComplete:(spec,result)=>{
        if(spec.kind==="fid"&&result?.state==="derivation_requested")return;
        void renderThreadHealth(host,threadId);
      }}));
    host.append(edits);
  }

  if (reconciliation?.state === "dead_letter" && unresolved(diagnosis).length > 0) {
    host.append(el("p", "thread-repair-note", "Quarantined until the identity or authority findings above are resolved."));
  }
  renderHealthRefresh(host, threadId);
}

export async function renderThreadHealth(host, threadId, message = null) {
  const waiting = el("div", "thread-loading");
  setWaitingContent(waiting, "Checking Thread health");
  host.replaceChildren(waiting);
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
  const name=view.querySelector(".thread-person-hero h2")?.textContent?.trim()??null;
  view.querySelector(".thread-person-hero")?.after(host,threadAppearanceSection(threadId,name));
}

if (dialogBody) {
  new MutationObserver(attach).observe(dialogBody, { childList:true, subtree:true });
}
