const rail = document.querySelector("#journey-rail");
const hint = document.querySelector(".journey-body-head span");

function refreshHint() {
  if (!rail || !hint) return;
  if (rail.querySelector(".journey-event-child")) {
    hint.textContent = "Tree view · indented orange rows are child operations · authoritative async causes are labeled";
  } else if (rail.childElementCount > 0) {
    hint.textContent = "No parent-operation edges on this page · legacy/pre-lineage Activity remains flat";
  }
}

if (rail) new MutationObserver(refreshHint).observe(rail, { childList: true });
refreshHint();
