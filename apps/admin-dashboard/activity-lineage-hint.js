import { orderCausalTree } from "/causal-tree.js";

const rail = document.querySelector("#journey-rail");
const hint = document.querySelector(".journey-body-head span");

function lineageFromTitle(title) {
  const operation = /^Operation ([^ ·]+)(?: · parent ([^ ·]+))?/u.exec(title ?? "");
  if (!operation) return { operationId:null, parentOperationId:null };
  return { operationId:operation[1], parentOperationId:operation[2] ?? null };
}

function arrangeTree() {
  if (!rail) return;
  const events = [...rail.querySelectorAll(":scope > .journey-event")];
  if (events.length === 0) return refreshHint();

  const ordered = orderCausalTree(events.map((event) => ({ event, ...lineageFromTitle(event.title) })));
  for (const { item, depth, orphan } of ordered) {
    const event = item.event;
    event.style.setProperty("--journey-indent", `${Math.min(depth, 6) * 18}px`);
    event.classList.toggle("journey-event-child", depth > 0);
    event.classList.toggle("journey-event-orphan", orphan);
    if (orphan) {
      const parent = event.querySelector(".journey-parent");
      if (parent) parent.textContent = `upstream operation not on this page · ${item.parentOperationId}`;
    }
  }

  const orderedEvents = ordered.map(({ item }) => item.event);
  if (orderedEvents.some((event, index) => events[index] !== event)) rail.replaceChildren(...orderedEvents);
  refreshHint();
}

function refreshHint() {
  if (!rail || !hint) return;
  const records = rail.childElementCount;
  const children = rail.querySelectorAll(".journey-event-child").length;
  const parents = rail.querySelectorAll(".journey-event-parent").length;
  const orphans = rail.querySelectorAll(".journey-event-orphan").length;
  if (children > 0 || orphans > 0) {
    hint.textContent = `Causal tree · ${children} nested operation${children === 1 ? "" : "s"} · ${parents} parent${parents === 1 ? "" : "s"}${orphans ? ` · ${orphans} upstream parent${orphans === 1 ? "" : "s"} outside this page` : ""}`;
  } else if (records > 0) {
    hint.textContent = `${records} root operation${records === 1 ? "" : "s"} · legacy/pre-lineage Activity remains flat`;
  }
}

if (rail) new MutationObserver(arrangeTree).observe(rail, { childList:true });
arrangeTree();
