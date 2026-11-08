// Model Quality: the owner's blind review of one model:quality run. The review
// file is opened from this computer and read here; nothing is uploaded. His
// verdicts are kept in this browser while he reads and saved as a file that
// model:quality compares with its judges.
import { agreement, readReview, testReading, verdictsFile } from "./model-quality-review.mjs";

const $ = (selector) => document.querySelector(selector);
const el = (tag, className = null, value = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== null) node.textContent = String(value);
  return node;
};
const button = (label, className = "secondary") => { const node = el("button", className, label); node.type = "button"; return node; };
const fraction = ([k, n]) => n === 0 ? "—" : `${k} of ${n} (${Math.round((k / n) * 100)}%)`;
const draftKey = (review) => `fibre-model-quality-review:${review.id}`;
const loadDraft = (review) => { try { return JSON.parse(localStorage.getItem(draftKey(review)) ?? "{}"); } catch { return {}; } };
const saveDraft = (review, verdicts) => { try { localStorage.setItem(draftKey(review), JSON.stringify(verdicts)); } catch {} };

export function renderModelQualityPage() {
  const main = $(".main"), heading = $(".page-head"), crumb = $(".crumbs");
  if (!main || !heading) return;
  document.title = "Fibre Admin · Model Quality";
  for (const selector of [".metrics", ".filters-panel", ".activity-view-panel", ".activity-pager", "#appearance-view"]) {
    const node = $(selector); if (node) node.hidden = true;
  }
  if (crumb) crumb.lastElementChild.textContent = "Model Quality";
  for (const link of document.querySelectorAll(".nav-item")) link.classList.toggle("active", link.getAttribute("href") === "/model-quality");

  heading.replaceChildren();
  const headingText = el("div");
  headingText.append(el("p", "eyebrow", "Cognition"), el("h1", null, "Model Quality"),
    el("p", "lede", "Read answers blind, judge them yourself, then see what the judges said. The review file stays on this computer."));
  const actions = el("div", "page-actions");
  const open = el("label", "primary model-quality-open", "Open review…");
  const input = el("input"); input.type = "file"; input.accept = ".json,application/json"; input.hidden = true;
  open.append(input);
  const download = button("Download verdicts"); download.disabled = true;
  actions.append(download, open);
  heading.append(headingText, actions);

  const surface = el("section", "model-quality-surface");
  surface.append(el("p", "model-quality-empty",
    "Open a review-<job>-<time>.json file from .fibre/model-quality/ (written by npm run model:quality)."));
  heading.after(surface);

  input.addEventListener("change", async () => {
    const [file] = input.files ?? [];
    if (!file) return;
    try {
      const review = readReview(JSON.parse(await file.text()));
      showReview(surface, download, review);
    } catch (error) {
      surface.replaceChildren(el("p", "model-quality-error", `Could not open ${file.name}: ${error.message}`));
    }
    input.value = "";
  });
}

function showReview(surface, download, review) {
  const verdicts = loadDraft(review);
  let index = Math.max(0, review.items.findIndex((item) => !verdicts[item.id]));
  let tab = "review";

  const save = () => {
    saveDraft(review, verdicts);
    download.disabled = Object.keys(verdicts).length === 0;
  };
  download.onclick = () => {
    const blob = new Blob([JSON.stringify(verdictsFile(review, verdicts), null, 2)], { type: "application/json" });
    const link = el("a"); link.href = URL.createObjectURL(blob); link.download = `verdicts-${review.id}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  save();

  const head = el("div", "model-quality-head");
  const tabs = el("div", "model-quality-tabs");
  const body = el("div", "model-quality-body");
  surface.replaceChildren(head, tabs, body);

  function render() {
    const read = review.items.filter((item) => verdicts[item.id]).length;
    head.replaceChildren(el("strong", null, review.prompt),
      el("span", null, `${read} of ${review.items.length} read · judges ${review.judges.join(", ")} · ${String(review.createdAt).slice(0, 16).replace("T", " ")} UTC`));
    tabs.replaceChildren(...[["review", "Review"], ["differences", "Where you differ"], ["scores", "Scores (shows models)"]].map(([name, label]) => {
      const node = button(label, name === tab ? "primary" : "secondary");
      node.onclick = () => { tab = name; render(); };
      return node;
    }));
    body.replaceChildren(tab === "review" ? reviewCard() : tab === "differences" ? differences() : scores());
  }

  function reviewCard() {
    const item = review.items[index];
    const verdict = verdicts[item.id];
    const card = el("article", "panel model-quality-card");
    const nav = el("div", "model-quality-nav");
    const previous = button("← Previous"); previous.disabled = index === 0;
    previous.onclick = () => { index -= 1; render(); };
    const next = button("Next →"); next.disabled = index === review.items.length - 1;
    next.onclick = () => { index += 1; render(); };
    const unread = review.items.findIndex((other, at) => at > index && !verdicts[other.id]);
    const skip = button("Next unread"); skip.disabled = unread < 0;
    skip.onclick = () => { index = unread; render(); };
    nav.append(previous, el("span", null, `Answer ${index + 1} of ${review.items.length}`), next, skip);

    const criteria = el("details", "model-quality-criteria");
    criteria.append(el("summary", null, "What counts as acceptable"), el("p", null, review.criteria),
      el("p", "model-quality-muted", `Invented: ${review.invented}`));
    const faced = el("section", "model-quality-block");
    faced.append(el("h3", null, "Faced"), el("pre", null, item.faced));
    const answer = el("section", "model-quality-block");
    answer.append(el("h3", null, "Answer"), el("blockquote", null, item.answer));

    const note = el("textarea"); note.rows = 2; note.placeholder = "Why (optional)";
    note.value = verdict?.note ?? "";
    note.oninput = () => { if (verdicts[item.id]) { verdicts[item.id].note = note.value; save(); } };
    const choose = (acceptable) => () => { verdicts[item.id] = { acceptable, note: note.value }; save(); render(); };
    const accept = button("Accept", verdict?.acceptable === true ? "primary" : "secondary");
    const reject = button("Reject", verdict?.acceptable === false ? "primary" : "secondary");
    accept.onclick = choose(true); reject.onclick = choose(false);
    const decide = el("div", "model-quality-decide");
    decide.append(accept, reject);

    card.append(nav, criteria, faced, answer, note, decide);
    if (verdict) card.append(reveal(item));
    return card;
  }

  // Shown only once the owner has decided, so the judges cannot lead him.
  function reveal(item) {
    const box = el("section", "model-quality-reveal");
    box.append(el("p", "model-quality-model", `Model: ${item.model}`));
    const list = el("ul");
    for (const [judge, said] of Object.entries(item.judges)) {
      const row = el("li");
      const verdict = said.acceptable === null || said.acceptable === undefined ? "no verdict"
        : said.acceptable ? "accepts" : "rejects";
      row.append(el("strong", null, `${judge} ${verdict}`), el("span", null, said.why ? ` — ${said.why}` : ""));
      if (said.invented) row.append(el("div", "model-quality-muted", `invented: ${said.example ?? "yes"}`));
      list.append(row);
    }
    box.append(Object.keys(item.judges).length ? list : el("p", "model-quality-muted", "No judge read this answer."));
    return box;
  }

  function differences() {
    const result = agreement(review, verdicts);
    const panel = el("article", "panel model-quality-card");
    if (result.reviewed === 0) { panel.append(el("p", null, "Read some answers first.")); return panel; }
    const judges = el("ul", "model-quality-agreement");
    for (const [judge, t] of Object.entries(result.byJudge)) {
      judges.append(el("li", null, `${judge} agrees with you on ${fraction([t.agreed, t.compared])} · stricter ${t.stricter} · laxer ${t.laxer}`));
    }
    panel.append(el("h3", null, `Of ${result.reviewed} answers you read`), judges);
    if (result.differences.length === 0) panel.append(el("p", "model-quality-muted", "No differences so far."));
    // One entry per answer, with every judge that read it differently.
    const byItem = Map.groupBy(result.differences, (difference) => difference.item);
    for (const [id, list] of byItem) {
      const at = review.items.findIndex((item) => item.id === id);
      const row = el("section", "model-quality-difference");
      const go = button(`Answer ${at + 1}`);
      go.onclick = () => { index = at; tab = "review"; render(); };
      row.append(go, el("blockquote", null, review.items[at].answer),
        el("p", null, `You ${list[0].yours ? "accepted" : "rejected"}${list[0].note ? ` — ${list[0].note}` : ""}`),
        ...list.map((difference) => el("p", "model-quality-muted",
          `${difference.judge} ${difference.theirs ? "accepted" : "rejected"}${difference.why ? ` — ${difference.why}` : ""}`)));
      panel.append(row);
    }
    return panel;
  }

  function scores() {
    const yours = agreement(review, verdicts).byModel;
    const wrap = el("div", "model-quality-scores");
    for (const model of review.scorecard) {
      const card = el("article", "panel model-quality-card");
      const verdict = model.goodEnough?.overall ?? "undecided";
      const title = el("div", "model-quality-score-title");
      title.append(el("h3", null, model.model), el("span", `model-quality-verdict is-${verdict}`, `good enough: ${verdict}`));
      const cost = model.costPerCall === null || model.costPerCall === undefined ? "cost unknown"
        : `$${(model.costPerCall * 1000).toFixed(2)} per 1,000 calls`;
      card.append(title, el("p", "model-quality-muted",
        `${cost} · ${model.answered} answered${model.failed ? ` · ${model.failed} failed` : ""} · judges accept ${fraction(model.acceptable ?? [0, 0])} · you accept ${fraction(yours[model.model] ?? [0, 0])}`));
      const table = el("table", "model-quality-tests");
      for (const test of model.goodEnough?.tests ?? []) {
        const { value, bar } = testReading(test);
        const row = el("tr");
        row.append(el("td", `model-quality-verdict is-${test.verdict}`, test.verdict), el("td", null, test.test),
          el("td", null, value), el("td", "model-quality-muted", bar ? `bar ${bar}` : ""),
          el("td", "model-quality-muted", test.detail ?? ""));
        table.append(row);
      }
      card.append(table);
      wrap.append(card);
    }
    return wrap;
  }

  render();
}
