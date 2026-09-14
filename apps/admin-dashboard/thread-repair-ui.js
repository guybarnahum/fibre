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
    CIVIL_IDENTITY:"Civil identity",
    FIN_MISSING:"FIN",
    FIN_PRESENTATION_MISSING:"FIN presentation",
    FIN_CONFLICT:"FIN conflict",
    NAME:"Name",
    NAME_MISSING:"Name",
    NAME_PRESENTATION_MISSING:"Name presentation",
    NAME_CONFLICT:"Name conflict",
    SEX:"Sex",
    SEX_MISSING:"Sex",
    CANONICAL_VISUAL_SPEC:"Canonical visual identity",
    CANONICAL_VISUAL_SPEC_MISSING:"Canonical visual identity",
    ORIGIN_ORIENTATION:"Origin orientation",
    ORIGIN_ORIENTATION_MISSING:"Origin orientation",
    BIRTH_DATE:"Birth date",
    BIRTH_DATE_PRESENTATION_MISSING:"Birth date presentation",
    BIRTH_DATE_CONFLICT:"Birth date conflict",
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
  if (finding.action === "migrate_genesis_sex") return `deterministic Genesis migration · ${finding.ruleId ?? "sex rule"}`;
  if (finding.state === "repairable") return "repairable";
  if (finding.state === "migration_required") return "migration required";
  if (finding.state === "operator_decision_required") return "operator review required";
  if (finding.state === "integrity_error") return "authority conflict";
  return human(finding.state);
}

function actionable(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => typeof finding?.action === "string" && finding.action !== "");
}

function unresolved(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => finding?.state !== "healthy");
}

async function requestDiagnosis(threadId) {
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    headers:{ Accept:"application/json" },
    cache:"no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  return payload.diagnosis;
}

async function applyRepair(threadId) {
  const repairKey = `admin_repair_${Date.now().toString(36)}`;
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    method:"POST",
    headers:{ "content-type":"application/json", Accept:"application/json" },
    body:JSON.stringify({ repairKey }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  return payload.result;
}

function healthRow(finding) {
  const row = el("div", `thread-repair-row ${finding.state}`);
  const icon = finding.state === "healthy" ? "✓" : finding.state === "integrity_error" ? "×" : "!";
  row.append(
    el("span", "thread-repair-icon", icon),
    el("strong", null, labelFor(finding.code)),
    el("span", "thread-repair-state", stateText(finding)),
  );
  return row;
}

function renderHealth(host, threadId, diagnosis, message = null) {
  host.replaceChildren();
  const head = el("div", "thread-person-section-head");
  head.append(el("h3", null, "Thread health"), el("span", null, human(diagnosis.health)));
  host.append(head);

  const rows = el("div", "thread-repair-list");
  for (const finding of diagnosis.findings ?? []) rows.append(healthRow(finding));
  host.append(rows);

  if (message) host.append(el("p", "thread-repair-message", message));
  const actions = actionable(diagnosis);
  if (actions.length === 0) return;

  const plan = el("div", "thread-repair-plan");
  plan.append(el("strong", null, `${actions.length} deterministic ${actions.length === 1 ? "action" : "actions"}`));
  for (const finding of actions) {
    const item = el("span", null, finding.action === "migrate_genesis_sex"
      ? `Restore missing sex using ${finding.ruleId} from immutable Thread identity.`
      : `${human(finding.action)}.`);
    plan.append(item);
  }
  plan.append(el("small", null, "Repair does not rewrite World history or invent identity facts."));

  const button = el("button", "primary thread-repair-button", "Fix Thread");
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Repairing…";
    try {
      const result = await applyRepair(threadId);
      const names = (result.actions ?? []).map((entry) => human(entry.action)).join(" · ");
      let current = result.after;
      renderHealth(host, threadId, current, names ? `Applied: ${names}` : "No repair action was required.");

      for (let attempt = 0; attempt < 30 && actionable(current).some((entry) => entry.state === "repairable"); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        current = await requestDiagnosis(threadId);
        renderHealth(host, threadId, current, "Waiting for asynchronous repair work to settle…");
      }

      const remaining = unresolved(current);
      renderHealth(
        host,
        threadId,
        current,
        remaining.length === 0 ? "Repair complete." : `Repair settled · ${remaining.map((entry) => stateText(entry)).join(" · ")}`,
      );
      const source = document.querySelector(`[data-thread-id="${CSS.escape(threadId)}"]`);
      if (source) source.click();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Fix Thread";
      host.append(el("div", "error-box", `Thread repair failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
  host.append(plan, button);
}

let generation = 0;
async function attach() {
  const view = dialogBody?.querySelector(".thread-person-view");
  const idNode = view?.querySelector(".thread-person-id");
  const threadId = idNode?.textContent?.trim();
  if (!view || !/^thr_[A-Za-z0-9._:-]+$/u.test(threadId ?? "")) return;
  if (view.querySelector(".thread-repair-section")) return;

  const token = ++generation;
  const host = el("section", "thread-person-section thread-repair-section");
  const hero = view.querySelector(".thread-person-hero");
  hero?.after(host);
  host.append(el("div", "thread-loading", "Checking Thread health…"));
  try {
    const diagnosis = await requestDiagnosis(threadId);
    if (token !== generation || !host.isConnected) return;
    renderHealth(host, threadId, diagnosis);
  } catch (error) {
    if (token !== generation || !host.isConnected) return;
    host.replaceChildren(el("div", "error-box", `Thread diagnosis unavailable: ${error instanceof Error ? error.message : String(error)}`));
  }
}

if (dialogBody) {
  new MutationObserver(() => { void attach(); }).observe(dialogBody, { childList:true, subtree:true });
}
