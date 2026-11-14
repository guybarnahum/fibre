const experiences = document.querySelector("#experiences");
const refresh = document.querySelector("#refresh");
const ORDER = { outage:0, degraded:1, operational:2 };
let timer = null;

function label(status) { return ({ operational:"Running", degraded:"Partly running", outage:"Paused" })[status] ?? "Unknown"; }
function time(value) { try { return new Intl.DateTimeFormat([], { timeStyle:"short" }).format(new Date(value)); } catch { return value; } }

function card(experience) {
  const item = document.createElement("article");
  item.className = `experience ${experience.status}`;
  const head = document.createElement("div"); head.className = "experience-head";
  const name = document.createElement("h2"); name.textContent = experience.name;
  const state = document.createElement("span"); state.className = "pill";
  state.textContent = label(experience.status);
  head.append(name, state);
  const summary = document.createElement("p"); summary.className = "summary"; summary.textContent = experience.summary;
  const about = document.createElement("p"); about.className = "about"; about.textContent = experience.description;
  item.append(head, summary, about);
  return item;
}

// The headline is what matters most: what is not running, or that all is.
function headline(payload) {
  const affected = payload.components.filter((item) => item.status !== "operational")
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  if (affected.length === 0) return ["Fibre is running normally",
    "Threads are living their days, new Threads can be born, and the website is up."];
  const [first, ...rest] = affected;
  return [first.summary.replace(/\.$/u, ""), rest.length
    ? rest.map((item) => item.summary).join(" ")
    : "Everything else is running normally."];
}

async function load() {
  refresh.disabled = true; refresh.textContent = "Checking…";
  try {
    const response = await fetch("/api/status", { headers:{ Accept:"application/json" }, cache:"no-store" });
    const payload = await response.json(); if (!response.ok) throw new Error("status unavailable");
    const [title, detail] = headline(payload);
    document.querySelector("#overall-title").textContent = title;
    document.querySelector("#overall-detail").textContent = detail;
    document.querySelector("#overall-dot").className = `dot ${payload.status}`;
    document.querySelector("#checked-at").textContent = `Checked at ${time(payload.checkedAt)}`;
    document.querySelector("#environment").textContent = payload.environment === "production" ? "" : payload.environment;
    experiences.replaceChildren(...payload.components.map(card));
  } catch {
    document.querySelector("#overall-title").textContent = "Status is unavailable right now";
    document.querySelector("#overall-detail").textContent = "This page could not check Fibre. Try again in a moment.";
    document.querySelector("#overall-dot").className = "dot checking";
    experiences.replaceChildren();
  } finally { refresh.disabled = false; refresh.textContent = "Check again"; }
}
refresh.addEventListener("click", load);
timer = setInterval(load, 60000);
window.addEventListener("pagehide", () => clearInterval(timer), { once:true });
load();
