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
  if (finding.migration?.id) return `migration required · ${finding.migration.label ?? human(finding.migration.id)}`;
  if (finding.state === "repairable") return "repairable";
  if (finding.state === "migration_required") return "migration required";
  if (finding.state === "operator_decision_required") return "operator review required";
  if (finding.state === "integrity_error") return "authority conflict";
  return human(finding.state);
}

function actionable(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => finding?.state === "repairable" && typeof finding?.action === "string" && finding.action !== "");
}

function migrations(diagnosis) {
  return (diagnosis?.findings ?? []).filter((finding) => typeof finding?.migration?.id === "string");
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
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  return Object.freeze({ diagnosis:payload.diagnosis, reconciliation:payload.reconciliation ?? null });
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
  return payload;
}

function collectMigrationInput(migration) {
  const fields = migration.input?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return null;
  const input = {};
  for (const field of fields) {
    if (typeof field?.name !== "string" || field.name === "") continue;
    const answer = window.prompt(field.label ?? human(field.name), field.default ?? "");
    if (answer === null) return undefined;
    if (field.required === true && answer.trim() === "") throw new Error(`${field.label ?? human(field.name)} is required`);
    input[field.name] = answer;
  }
  return input;
}

async function applyMigration(threadId, migration) {
  const input = collectMigrationInput(migration);
  if (input === undefined) return null;
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    method:"POST",
    headers:{ "content-type":"application/json", Accept:"application/json" },
    body:JSON.stringify({
      action:"migrate",
      migrationId:migration.id,
      migrationKey:`admin_migration_${Date.now().toString(36)}`,
      input,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error ?? `HTTP ${response.status}`);
  return payload;
}

async function recover(threadId) {
  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/repair`, {
    method:"POST",
    headers:{ "content-type":"application/json", Accept:"application/json" },
    body:JSON.stringify({ action:"recover" }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.detail ?? payload?.error?.code ?? payload?.error ?? `HTTP ${response.status}`);
  return payload.recovery;
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

function reconciliationRow(reconciliation) {
  if (reconciliation === null) return null;
  const row = el("div", `thread-repair-row ${reconciliation.state}`);
  const healthy = reconciliation.state === "complete";
  const detail = reconciliation.state === "dead_letter"
    ? `dead letter${reconciliation.lastError?.code ? ` · ${human(reconciliation.lastError.code)}` : ""}`
    : human(reconciliation.state);
  row.append(
    el("span", "thread-repair-icon", healthy ? "✓" : reconciliation.state === "dead_letter" ? "×" : "!"),
    el("strong", null, "Reconciliation"),
    el("span", "thread-repair-state", detail),
  );
  if (reconciliation.lastError?.message) row.title = reconciliation.lastError.message;
  return row;
}

function recoveryPlan(host, threadId, diagnosis, reconciliation) {
  if (reconciliation?.state !== "dead_letter") return;
  const outstanding = unresolved(diagnosis);
  if (outstanding.length !== 0) {
    const plan = el("div", "thread-repair-plan");
    plan.append(
      el("strong", null, "Dead letter quarantined"),
      el("span", null, reconciliation.lastError?.message ?? "Background reconciliation stopped after a terminal failure."),
      el("small", null, "Resolve migration or authoritative Thread findings above before retrying; Fibre will not burn retries on a known-bad Thread."),
    );
    host.append(plan);
    return;
  }

  const plan = el("div", "thread-repair-plan");
  plan.append(
    el("strong", null, "Ready to recover"),
    el("span", null, reconciliation.lastError?.message ?? "The Thread is quarantined from background reconciliation."),
    el("small", null, "Recovery requeues only this Thread and schedules one World reconciliation wake."),
  );
  const button = el("button", "primary thread-repair-button", "Recover");
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Recovering…";
    try {
      await recover(threadId);
      await renderThreadHealth(host, threadId, "Recovered · reconciliation is pending.");
    } catch (error) {
      button.disabled = false;
      button.textContent = "Recover";
      host.append(el("div", "error-box", `Thread recovery failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
  host.append(plan, button);
}

function migrationPlan(host, threadId, diagnosis, reconciliation) {
  const available = migrations(diagnosis);
  if (available.length === 0) return false;
  const plan = el("div", "thread-repair-plan");
  plan.append(
    el("strong", null, `${available.length} authoritative ${available.length === 1 ? "migration" : "migrations"} available`),
    el("small", null, "Migration changes a legacy authoritative representation only from declared evidence; it is distinct from repair and recovery."),
  );
  for (const finding of available) {
    const migration = finding.migration;
    const button = el("button", "primary thread-repair-button", `Migrate · ${migration.label ?? human(migration.id)}`);
    button.type = "button";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Migrating…";
      try {
        const payload = await applyMigration(threadId, migration);
        if (payload === null) {
          button.disabled = false;
          button.textContent = `Migrate · ${migration.label ?? human(migration.id)}`;
          return;
        }
        const next = Object.freeze({ diagnosis:payload.migration.after, reconciliation:payload.reconciliation ?? reconciliation });
        renderHealth(host, threadId, next, `Migration complete · ${migration.label ?? human(migration.id)}.`);
      } catch (error) {
        button.disabled = false;
        button.textContent = `Migrate · ${migration.label ?? human(migration.id)}`;
        host.append(el("div", "error-box", `Thread migration failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    plan.append(button);
  }
  host.append(plan);
  return true;
}

function renderHealth(host, threadId, health, message = null) {
  const { diagnosis, reconciliation } = health;
  host.replaceChildren();
  const head = el("div", "thread-person-section-head");
  head.append(el("h3", null, "Thread health"), el("span", null, human(diagnosis.health)));
  host.append(head);

  const rows = el("div", "thread-repair-list");
  const workRow = reconciliationRow(reconciliation);
  if (workRow) rows.append(workRow);
  for (const finding of diagnosis.findings ?? []) rows.append(healthRow(finding));
  host.append(rows);

  if (message) host.append(el("p", "thread-repair-message", message));
  if (migrationPlan(host, threadId, diagnosis, reconciliation)) return;

  const actions = actionable(diagnosis);
  if (actions.length === 0) {
    recoveryPlan(host, threadId, diagnosis, reconciliation);
    return;
  }

  const plan = el("div", "thread-repair-plan");
  plan.append(el("strong", null, `${actions.length} deterministic ${actions.length === 1 ? "repair" : "repairs"}`));
  for (const finding of actions) plan.append(el("span", null, `${human(finding.action)}.`));
  plan.append(el("small", null, "Repair restores state already derivable from current authority; it does not migrate legacy authority or invent identity facts."));

  const button = el("button", "primary thread-repair-button", reconciliation?.state === "dead_letter" ? "Fix & Recover" : "Fix Thread");
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Repairing…";
    try {
      const payload = await applyRepair(threadId);
      const result = payload.result;
      const names = (result.actions ?? []).map((entry) => human(entry.action)).join(" · ");
      let current = Object.freeze({ diagnosis:result.after, reconciliation:payload.reconciliation ?? null });
      renderHealth(host, threadId, current, names ? `Applied: ${names}` : "No repair action was required.");

      for (let attempt = 0; attempt < 30 && actionable(current.diagnosis).length > 0; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        current = await requestHealth(threadId);
        renderHealth(host, threadId, current, "Waiting for asynchronous repair work to settle…");
      }

      const remaining = unresolved(current.diagnosis);
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
      button.textContent = reconciliation?.state === "dead_letter" ? "Fix & Recover" : "Fix Thread";
      host.append(el("div", "error-box", `Thread repair failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
  host.append(plan, button);
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
  view.querySelector(".thread-person-hero")?.after(host);
  void renderThreadHealth(host, threadId);
}

if (dialogBody) {
  new MutationObserver(attach).observe(dialogBody, { childList:true, subtree:true });
}
