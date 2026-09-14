import { causalTreeVisibility } from "/causal-tree.js";

const rail = document.querySelector("#journey-rail");
const hint = document.querySelector(".journey-body-head span");
const collapsed = new Set();

function lineageFromTitle(title) {
  const operation = /^Operation ([^ ·]+)(?: · parent ([^ ·]+))?/u.exec(title ?? "");
  if (!operation) return { operationId:null, parentOperationId:null };
  return { operationId:operation[1], parentOperationId:operation[2] ?? null };
}

function modelFor(event) {
  const lineage = lineageFromTitle(event.title);
  return { event, ...lineage };
}

function disclosure(event, operationId, childCount) {
  let control = event.querySelector(":scope > .causal-disclosure");
  if (childCount === 0 || !operationId) {
    control?.remove();
    return;
  }
  if (!control) {
    control = document.createElement("span");
    control.className = "causal-disclosure";
    event.prepend(control);
  }
  const isCollapsed = collapsed.has(operationId);
  control.textContent = isCollapsed ? "▸" : "▾";
  control.title = isCollapsed ? "Expand branch" : "Collapse branch";
  control.dataset.operationId = operationId;
}

function arrangeTree() {
  if (!rail) return;
  const events = [...rail.querySelectorAll(":scope > .journey-event")];
  if (events.length === 0) return refreshHint();

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

  const orderedEvents = visible.map(({ item }) => item.event);
  if (orderedEvents.some((event, index) => events[index] !== event)) rail.replaceChildren(...orderedEvents);
  refreshHint();
}

function toggle(operationId, forceCollapsed = null) {
  if (!operationId) return;
  const next = forceCollapsed ?? !collapsed.has(operationId);
  if (next) collapsed.add(operationId); else collapsed.delete(operationId);
  arrangeTree();
}

function refreshHint() {
  if (!rail || !hint) return;
  const records = rail.querySelectorAll(":scope > .journey-event").length;
  const children = rail.querySelectorAll(":scope > .journey-event-child").length;
  const parents = rail.querySelectorAll(":scope > .journey-event-parent").length;
  const orphans = rail.querySelectorAll(":scope > .journey-event-orphan").length;
  if (children > 0 || orphans > 0) {
    hint.textContent = `Causal tree · ${children} nested operation${children === 1 ? "" : "s"} · ${parents} parent${parents === 1 ? "" : "s"}${collapsed.size ? ` · ${collapsed.size} collapsed` : ""}${orphans ? ` · ${orphans} upstream parent${orphans === 1 ? "" : "s"} outside this page` : ""}`;
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

if (rail) new MutationObserver(arrangeTree).observe(rail, { childList:true });
arrangeTree();
