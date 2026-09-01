const components = document.querySelector("#components");
const refresh = document.querySelector("#refresh");
let timer = null;

function label(status) { return ({ operational:"Operational", degraded:"Degraded", outage:"Unavailable" })[status] ?? "Unknown"; }
function time(value) { try { return new Intl.DateTimeFormat([], { dateStyle:"medium", timeStyle:"medium" }).format(new Date(value)); } catch { return value; } }
function renderComponent(component) {
  const row = document.createElement("div"); row.className = "component";
  const name = document.createElement("div"); name.className = "component-name";
  const strong = document.createElement("strong"); strong.textContent = component.name;
  const detail = document.createElement("span"); detail.textContent = component.description;
  name.append(strong, detail);
  const state = document.createElement("div"); state.className = `component-status ${component.status}`;
  const dot = document.createElement("span"); dot.className = "mini";
  const text = document.createElement("span"); text.textContent = label(component.status);
  state.append(dot, text); row.append(name, state); return row;
}
function overallCopy(status) {
  if (status === "operational") return ["All systems operational", "Fibre's public experience and runtime health checks are responding normally."];
  if (status === "degraded") return ["Some systems are degraded", "One or more Fibre components are not responding normally."];
  return ["Service disruption", "Multiple Fibre components are currently unavailable."];
}
async function load() {
  refresh.disabled = true; refresh.textContent = "Refreshing…";
  try {
    const response = await fetch("/api/status", { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json(); if (!response.ok) throw new Error("status unavailable");
    const [title, detail] = overallCopy(payload.status);
    document.querySelector("#overall-title").textContent = title;
    document.querySelector("#overall-detail").textContent = detail;
    document.querySelector("#overall-dot").className = `dot ${payload.status}`;
    document.querySelector("#environment").textContent = payload.environment;
    document.querySelector("#checked-at").textContent = `Checked ${time(payload.checkedAt)}`;
    components.replaceChildren(...payload.components.map(renderComponent));
  } catch {
    document.querySelector("#overall-title").textContent = "Status temporarily unavailable";
    document.querySelector("#overall-detail").textContent = "The status service could not complete its current health check.";
    document.querySelector("#overall-dot").className = "dot outage";
    components.replaceChildren();
  } finally { refresh.disabled = false; refresh.textContent = "Refresh"; }
}
refresh.addEventListener("click", load);
timer = setInterval(load, 30000);
window.addEventListener("pagehide", () => clearInterval(timer), { once:true });
load();
