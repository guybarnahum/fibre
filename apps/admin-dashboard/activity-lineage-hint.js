const rail = document.querySelector("#journey-rail");
const hint = document.querySelector(".journey-body-head span");

function refreshHint() {
  if (!rail || !hint) return;
  const records = rail.childElementCount;
  const children = rail.querySelectorAll(".journey-event-child").length;
  const parents = rail.querySelectorAll(".journey-event-parent").length;
  if (children > 0) {
    hint.textContent = `Tree view · ${children} child operation${children === 1 ? "" : "s"} · ${parents} visible parent${parents === 1 ? "" : "s"} · orange rows are nested work`;
  } else if (records > 0) {
    hint.textContent = `${records} operations · 0 parent-operation edges on this page · legacy/pre-lineage Activity remains flat`;
  }
}

if (rail) new MutationObserver(refreshHint).observe(rail, { childList: true });
refreshHint();
