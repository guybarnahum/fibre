import { fixtures } from "./fixtures.js";

let thread = structuredClone(fixtures.mina);
const $ = (id) => document.getElementById(id);

function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function renderList(id, values) {
  $(id).replaceChildren(...values.map((value) => {
    const li = document.createElement("li"); li.textContent = value; return li;
  }));
}

function render() {
  $("avatar").textContent = initials(thread.identity.name);
  $("orientation").textContent = `${thread.identity.originOrientation} Thread`;
  $("name").textContent = thread.identity.name;
  $("description").textContent = thread.identity.selfDescription;
  $("culture").replaceChildren(...(thread.identity.culture ?? []).map((value) => {
    const span = document.createElement("span"); span.textContent = value; return span;
  }));
  $("threadStatus").textContent = thread.status;
  $("version").textContent = thread.version;
  $("birthCity").textContent = thread.identity.birthCity ?? "—";
  $("workCity").textContent = thread.identity.currentWorkCity ?? "—";
  $("fc").textContent = thread.accounts?.fibreCredits ?? "—";
  $("tokens").textContent = (thread.accounts?.modelTokensAvailable ?? 0).toLocaleString();
  $("traits").replaceChildren(...Object.entries(thread.genome.textualTraits).map(([key,value]) => {
    const div=document.createElement("div"); div.className="trait";
    const strong=document.createElement("strong"); strong.textContent=key;
    const p=document.createElement("p"); p.textContent=value;
    div.append(strong,p); return div;
  }));
  renderList("needs", thread.currentState.needs);
  renderList("feelings", thread.currentState.feelings);
  $("selfModel").value = thread.currentState.selfModel;
  $("raw").textContent = JSON.stringify(thread, null, 2);
  $("command").textContent = "No proposed command.";
  $("capsule").textContent = "Build a context capsule to preview thawing.";
}

$("fixtureSelect").addEventListener("change", (event) => {
  thread = structuredClone(fixtures[event.target.value]); render();
});

$("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { thread = JSON.parse(await file.text()); render(); $("status").textContent="Loaded local JSON · no live writes"; }
  catch (error) { $("status").textContent=`Invalid JSON: ${error.message}`; }
});

$("proposeButton").addEventListener("click", () => {
  const next = $("selfModel").value.trim();
  const command = {
    commandType: "REVISE_SELF_MODEL",
    threadId: thread.threadId,
    expectedVersion: thread.version,
    proposedText: next,
    reason: "Human proposal from Thread Editor fixture mode",
    requires: ["identity:write", "event:append"]
  };
  $("command").textContent = JSON.stringify(command, null, 2);
});

$("thawButton").addEventListener("click", () => {
  const capsule = {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    traits: Object.values(thread.genome.textualTraits),
    selfModel: thread.currentState.selfModel,
    needs: thread.currentState.needs,
    feelings: thread.currentState.feelings,
    objective: $("objective").value,
    budgets: thread.accounts,
    auditPolicies: ["goal_guardian", "self_examiner_steward"]
  };
  $("capsule").textContent = JSON.stringify(capsule, null, 2);
});

$("downloadButton").addEventListener("click", () => {
  const updated = structuredClone(thread);
  updated.currentState.selfModel = $("selfModel").value;
  const blob = new Blob([JSON.stringify(updated,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${thread.threadId}.json`; a.click(); URL.revokeObjectURL(a.href);
});

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  $("command").hidden = button.dataset.tab !== "command";
  $("raw").hidden = button.dataset.tab !== "raw";
}));

render();
