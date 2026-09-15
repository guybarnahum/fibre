import { causalTreeVisibility } from "/causal-tree.js";

const rail = document.querySelector("#journey-rail");
const hint = document.querySelector(".journey-body-head span");
const head = document.querySelector(".journey-body-head");
const collapsed = new Set();
let observer = null;
let collapseAllButton = null;

function lineageFromTitle(title) {
  const operation = /^Operation ([^ ·]+)(?: · parent ([^ ·]+))?/u.exec(title ?? "");
  if (!operation) return { operationId:null, parentOperationId:null };
  return { operationId:operation[1], parentOperationId:operation[2] ?? null };
}

function stageFor(event) {
  return event.querySelector(".journey-copy > span")?.textContent ?? "";
}

function modelFor(event) {
  const lineage = lineageFromTitle(event.title);
  return { event, stage:stageFor(event), ...lineage };
}

function genesisPhase(stage) {
  if (stage.startsWith("birth.genesis.history.")) return { key:"history", label:"Historical life" };
  if (stage.startsWith("birth.genesis.memory_selection.") || stage.startsWith("birth.genesis.meaning_formation.")) {
    return { key:"memory", label:"Autobiographical memory & meaning" };
  }
  if (stage.startsWith("birth.genesis.meaning_reinterpretation.")) return { key:"reinterpretation", label:"Meaning reinterpretation" };
  return null;
}

function disclosure(event, operationId, childCount) {
  let control = event.querySelector(".causal-disclosure");
  if (childCount === 0 || !operationId) {
    control?.remove();
    return;
  }
  if (!control) {
    control = document.createElement("span");
    control.className = "causal-disclosure";
    const heading = event.querySelector(".journey-copy > strong");
    if (heading) heading.prepend(control); else event.prepend(control);
  }
  const isCollapsed = collapsed.has(operationId);
  control.textContent = isCollapsed ? "▸" : "▾";
  control.title = isCollapsed ? "Expand branch" : "Collapse branch";
  control.dataset.operationId = operationId;
}

function phaseMarker(label, count, depth) {
  const marker = document.createElement("div");
  marker.className = "journey-phase";
  marker.style.setProperty("--journey-indent", `${Math.min(depth, 6) * 18}px`);
  const name = document.createElement("strong");
  name.textContent = label;
  const summary = document.createElement("span");
  summary.textContent = `${count} operation${count === 1 ? "" : "s"}`;
  marker.append(name, summary);
  return marker;
}

function decorateGenesisPhases(visible) {
  const byOperation = new Map(
    visible
      .filter(({ item }) => item.operationId)
      .map(({ item }) => [item.operationId, item]),
  );
  const phaseCounts = new Map();
  for (const entry of visible) {
    if (entry.hidden) continue;
    const parent = entry.item.parentOperationId ? byOperation.get(entry.item.parentOperationId) : null;
    if (parent?.stage !== "birth.genesis.start") continue;
    const phase = genesisPhase(entry.item.stage);
    if (!phase) continue;
    const id = `${parent.operationId}:${phase.key}`;
    phaseCounts.set(id, (phaseCounts.get(id) ?? 0) + 1);
  }

  let currentPhase = null;
  for (const entry of visible) {
    const event = entry.item.event;
    event.classList.remove("journey-event-phase-child");
    const parentLabel = event.querySelector(".journey-parent");
    if (parentLabel?.dataset.originalText) parentLabel.textContent = parentLabel.dataset.originalText;
    if (entry.hidden) continue;

    const parent = entry.item.parentOperationId ? byOperation.get(entry.item.parentOperationId) : null;
    const phase = parent?.stage === "birth.genesis.start" ? genesisPhase(entry.item.stage) : null;
    if (!phase) {
      currentPhase = null;
      continue;
    }

    const id = `${parent.operationId}:${phase.key}`;
    if (currentPhase !== id) {
      event.before(phaseMarker(phase.label, phaseCounts.get(id) ?? 1, entry.depth + 1));
      currentPhase = id;
    }
    event.classList.add("journey-event-phase-child");
    event.style.setProperty("--journey-indent", `${Math.min(entry.depth + 2, 6) * 18}px`);
    if (parentLabel) {
      parentLabel.dataset.originalText ||= parentLabel.textContent;
      parentLabel.textContent = `within ${phase.label}`;
    }
  }
}

function parentOperationIds(events) {
  const models = events.map(modelFor);
  const parentIds = new Set(models.map(({ parentOperationId }) => parentOperationId).filter(Boolean));
  return models.map(({ operationId }) => operationId).filter((operationId) => operationId && parentIds.has(operationId));
}

function refreshCollapseAll(events) {
  if (!collapseAllButton) return;
  const parents = parentOperationIds(events);
  collapseAllButton.hidden = parents.length === 0;
  if (parents.length === 0) return;
  const allCollapsed = parents.every((operationId) => collapsed.has(operationId));
  collapseAllButton.textContent = allCollapsed ? "Expand all" : "Collapse all";
  collapseAllButton.setAttribute("aria-label", allCollapsed ? "Expand all causal branches" : "Collapse all causal branches");
}

function arrangeTree() {
  if (!rail) return;
  observer?.disconnect();
  try {
    rail.querySelectorAll(":scope > .journey-phase").forEach((node) => node.remove());
    const events = [...rail.querySelectorAll(":scope > .journey-event")];
    const operationIds = new Set(events.map((event) => lineageFromTitle(event.title).operationId).filter(Boolean));
    for (const operationId of collapsed) if (!operationIds.has(operationId)) collapsed.delete(operationId);
    if (events.length === 0) {
      refreshCollapseAll(events);
      refreshHint();
      return;
    }

    const visible = causalTreeVisibility(events.map(modelFor), collapsed);
    for (const { item, depth, orphan, childCount, hidden } of visible) {
      const event = item.event;
      event.style.setProperty("--journey-indent", `${Math.min(depth, 6) * 18}px`);
      event.dataset.causalDepth = String(depth);
      event.hidden = hidden;
      event.classList.toggle("journey-event-child", depth > 0);
      event.classList.toggle("journey-event-orphan", orphan);
      event.classList.toggle("journey-event-collapsed", Boolean(item.operationId && collapsed.has(item.operationId)));
      disclosure(event, item.operationId, childCount);
      if (orphan) {
        const parent = event.querySelector(".journey-parent");
        if (parent) parent.textContent = `upstream operation not on this page · ${item.parentOperationId}`;
      }
    }

    rail.replaceChildren(...visible.map(({ item }) => item.event));
    decorateGenesisPhases(visible);
    refreshCollapseAll(events);
    refreshHint();
  } finally {
    observer?.observe(rail, { childList:true });
  }
}

function toggle(operationId, forceCollapsed = null) {
  if (!operationId) return;
  const next = forceCollapsed ?? !collapsed.has(operationId);
  if (next) collapsed.add(operationId); else collapsed.delete(operationId);
  arrangeTree();
}

function toggleAll() {
  if (!rail) return;
  const events = [...rail.querySelectorAll(":scope > .journey-event")];
  const parents = parentOperationIds(events);
  const collapse = parents.some((operationId) => !collapsed.has(operationId));
  for (const operationId of parents) {
    if (collapse) collapsed.add(operationId); else collapsed.delete(operationId);
  }
  arrangeTree();
}

function refreshHint() {
  if (!rail || !hint) return;
  const records = rail.querySelectorAll(":scope > .journey-event").length;
  const children = rail.querySelectorAll(":scope > .journey-event-child").length;
  const parents = rail.querySelectorAll(":scope > .journey-event-parent").length;
  const phases = rail.querySelectorAll(":scope > .journey-phase").length;
  const orphans = rail.querySelectorAll(":scope > .journey-event-orphan").length;
  if (children > 0 || orphans > 0) {
    hint.textContent = `Causal tree · ${children} nested operation${children === 1 ? "" : "s"}${phases ? ` · ${phases} semantic phase${phases === 1 ? "" : "s"}` : ""} · ${parents} parent${parents === 1 ? "" : "s"}${collapsed.size ? ` · ${collapsed.size} collapsed` : ""}${orphans ? ` · ${orphans} upstream parent${orphans === 1 ? "" : "s"} outside this page` : ""}`;
  } else if (records > 0) {
    hint.textContent = `${records} root operation${records === 1 ? "" : "s"} · legacy/pre-lineage Activity remains flat`;
  }
}

rail?.addEventListener("click", (event) => {
  const disclosure = event.target.closest?.(".causal-disclosure");
  if (!disclosure) return;
  event.preventDefault();
  event.stopPropagation();
  toggle(disclosure.dataset.operationId);
}, true);

rail?.addEventListener("keydown", (event) => {
  const row = event.target.closest?.(".journey-event-parent");
  if (!row) return;
  const { operationId } = lineageFromTitle(row.title);
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    toggle(operationId, true);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    toggle(operationId, false);
  }
});

if (head) {
  collapseAllButton = document.createElement("button");
  collapseAllButton.type = "button";
  collapseAllButton.className = "causal-collapse-all";
  collapseAllButton.textContent = "Collapse all";
  collapseAllButton.hidden = true;
  collapseAllButton.addEventListener("click", toggleAll);
  head.append(collapseAllButton);
}

if (rail) {
  observer = new MutationObserver(arrangeTree);
  observer.observe(rail, { childList:true });
}
arrangeTree();
