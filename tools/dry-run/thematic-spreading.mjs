// Dry run of thematic spreading: pursuits and curiosities from the Body
// (docs/validation/mechanism-dry-run.md), with the eight staging Threads' real
// genes and Fibre's own Body level component. Cognition is a stand-in: a choice
// is more likely the stronger its felt pull (softmax), never certain.
// Reflection is a stand-in too: it acts only on what the Body felt (a lift,
// fullness, felt progress, a liking that faded), with chance.
// usage: npm run dry-run:thematic-spreading > .fibre/dry-run/thematic-spreading.json
import { pathToFileURL } from "node:url";
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";

export const GENES = { // exploration gain/persist, mastery gain/persist, social gain (staging, Nov 24)
  Kadir:[-0.92,-0.71,-0.09,0.98,0.12], Hassan:[0.97,-0.93,-0.09,0.98,0.94], Nathan:[0.87,0.38,-0.62,0.46,0.12],
  Mikias:[-0.92,-0.71,-0.62,0.46,-0.14], Surafel:[-0.23,0.98,-0.72,0.2,0.3], Kaleb:[0.06,0.43,-0.98,-0.56,-0.49],
  Habiba:[-0.23,0.98,0.25,0.26,-0.14], Bontu:[0.97,-0.93,0.3,-0.23,0.35] };
const SECTORS = 21, THEMES = 630; // a world of 630 themes, thirty in each of ISIC's 21 sections
const sectorOf = (theme) => theme % SECTORS;
const FLOOR = 0.35, BUILD = 12, HOLD = 168, DAY = 24;
const GLOW = +(process.env.GLOW ?? 3.5), LIKE = +(process.env.LIKE ?? 1.2), HABITUATION_DEFAULT = +(process.env.HAB ?? 2); // felt edges: competence felt as getting somewhere; a curiosity still liked

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

export function run({ days = 90, seed = 1, fullness = true, itch = true, bodyInReflection = true, social = true,
  habituation = HABITUATION_DEFAULT, fullnessByGain = process.env.FULLNESS_BY_GAIN === "1" } = {}) {
  const HABITUATION = habituation;
  const rand = rng(seed);
  const at = (h) => h * HOUR_MS;
  const people = Object.entries(GENES).map(([name, [eg, ep, mg, mp, sg]]) => ({
    name, eg: 2 ** eg, ep, mg: 2 ** mg, mp, sg: 2 ** sg,
    themes: new Map([[0, { kind: "pursuit", met: Array.from({ length: 40 }, (_, i) => -i * 4), last: 0, since: 0, lifts: [] }]]), // today: one shared theme, long held
    novelty: [], held: new Set([0]),
  }));
  const satiety = (p, t, h) => bodyLevel({ at: at(h), events: p.themes.get(t).met.map((m) => ({ at: at(m), size: 0.35 })),
    halfLife: inheritedHalfLife(2 * DAY * HOUR_MS, p.ep), bound: { saturate: 1 } }).level;
  const noveltyOf = (p, h) => bodyLevel({ at: at(h), events: p.novelty.filter((e) => e.at <= h).map((e) => ({ at: at(e.at), size: e.size })),
    halfLife: inheritedHalfLife(12 * HOUR_MS, p.ep), bound: { saturate: 1 } }).level;
  // Going deeper in one theme: each engagement adds, and it fades in days,
  // more slowly the more persistent the inherited mastery.
  const competence = (p, t, h) => bodyLevel({ at: at(h), events: p.themes.get(t).met.map((m) => ({ at: at(m), size: 1 })),
    halfLife: 3 * DAY * HOUR_MS * 2 ** (0.5 * p.mp) }).level;
  // How much meeting it lifts it: each lift adds, fading over ten days.
  const likingOf = (p, t, h) => bodyLevel({ at: at(h), events: (p.themes.get(t).lifts ?? []).map((m) => ({ at: at(m), size: 1 })),
    halfLife: 10 * DAY * HOUR_MS }).level;
  const itchOf = (p, t, h) => {
    const hours = h - p.themes.get(t).last, hold = HOLD * 2 ** p.mp;
    return 0.5 * (1 - 2 ** (-hours / BUILD)) * 2 ** (-Math.max(0, hours - hold) / hold) * p.mg;
  };
  // What the Body pulls toward now, for each thing it could do.
  const pulls = (p, h) => {
    const novelty = noveltyOf(p, h);
    const hunger = novelty < FLOOR ? 0.5 * (FLOOR - novelty) / FLOOR * p.eg : 0;
    const options = [{ act: "explore", pull: 0.05 + hunger }];
    for (const [t, theme] of p.themes) {
      // Fullness is felt by everyone; exploration gain sets only the appetite for new (Nov 25).
      const full = fullness ? satiety(p, t, h) * (fullnessByGain ? p.eg : 1) : 0;
      const want = theme.kind === "pursuit" ? (itch ? itchOf(p, t, h) : 0.25) : 0.2 * p.eg * (1 - satiety(p, t, h));
      options.push({ act: "engage", theme: t, pull: Math.max(0, want * (1 - (fullness ? satiety(p, t, h) : 0)) - 0.5 * full) });
    }
    return options;
  };
  const choose = (options) => {
    const w = options.map((o) => Math.exp(o.pull / 0.08)), total = w.reduce((a, b) => a + b, 0);
    let r = rand() * total; return options.find((_, i) => (r -= w[i]) <= 0) ?? options.at(-1);
  };
  // Meeting a theme: one it holds is engaged (and, if not yet full of it, lifts
  // it a little); one it does not hold is something new, which lifts it when
  // its novelty rises above the floor.
  const meet = (p, t, h, newToIt) => {
    if (p.themes.has(t)) {
      const theme = p.themes.get(t);
      // It lifts only if this meeting brings something new in it: the more it
      // was met this week, the likelier it is heard before (habituation).
      const recent = theme.met.filter((m) => m > h - 7 * DAY).length;
      if ((fullness ? satiety(p, t, h) < 0.5 : true) && rand() < Math.exp(-recent / HABITUATION)) (theme.lifts ??= []).push(h);
      theme.met.push(h); theme.last = h;
    } else {
      p.novelty.push({ at: h, size: newToIt ? 1 : 0.5, theme: t });
      p.novelty.at(-1).lifted = noveltyOf(p, h) >= FLOOR;
    }
  };
  const series = [];
  for (let day = 0; day < days; day++) {
    for (let slot = 0; slot < 8; slot++) {
      const h = day * DAY + 7 + slot * 2;
      for (const p of people) {
        const choice = choose(pulls(p, h));
        if (choice.act === "explore") { meet(p, Math.floor(rand() * THEMES), h, true); continue; }
        meet(p, choice.theme, h, false);
        // Talking about it with someone: they meet the same theme.
        if (social && rand() < 0.35 * Math.min(1, p.sg)) {
          const other = people[Math.floor(rand() * people.length)];
          if (other !== p) meet(other, choice.theme, h, !other.themes.has(choice.theme));
        }
      }
    }
    // Nightly reflection: what it cares about changes only by what the Body felt.
    // A pursuit is held while going on in it is felt as getting somewhere (the
    // glow of competence); split too thin, none is, and the weakest is let go.
    // A curiosity is held while meeting it still lifts; when that fades, so does it.
    const h = day * DAY + 23;
    for (const p of people) {
      for (const [t, theme] of [...p.themes]) {
        const depth = competence(p, t, h), liking = likingOf(p, t, h);
        if (!bodyInReflection) { if (theme.met.some((m) => m > h - DAY)) theme.kind = "pursuit"; continue; }
        if (theme.kind === "pursuit" && depth < GLOW && h - theme.since > 7 * DAY) { theme.kind = "curiosity"; theme.since = h; }
        else if (theme.kind === "curiosity" && depth >= GLOW && rand() < 0.3 * Math.min(1, p.mg)) { theme.kind = "pursuit"; theme.since = h; }
        else if (theme.kind === "curiosity" && liking < LIKE && h - theme.since > 7 * DAY) p.themes.delete(t);
      }
      // Something new that lifted it more than once becomes a curiosity of its own.
      for (const t of new Set(p.novelty.filter((x) => x.at > h - 7 * DAY && !p.themes.has(x.theme)).map((x) => x.theme))) {
        const lifts = p.novelty.filter((x) => x.theme === t && x.at > h - 7 * DAY && x.lifted).length;
        if ((bodyInReflection ? lifts >= 2 : lifts >= 1) && rand() < 0.5 * Math.min(1, p.eg))
          p.themes.set(t, { kind: "curiosity", met: [], last: h, since: h, lifts: [] });
      }
    }
    series.push(snapshot(people));
  }
  return { people, series };
}

function snapshot(people) {
  const count = (p, kind) => [...p.themes.values()].filter((t) => t.kind === kind).length;
  const sets = people.map((p) => new Set(p.themes.keys()));
  let overlap = 0, pairs = 0;
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const inter = [...sets[i]].filter((t) => sets[j].has(t)).length, union = new Set([...sets[i], ...sets[j]]).size;
    overlap += inter / union; pairs++;
  }
  const primary = people.map((p) => [...p.themes].filter(([, t]) => t.kind === "pursuit")
    .sort((a, b) => b[1].met.length - a[1].met.length)[0]?.[0]).filter((t) => t !== undefined);
  return { theme0: people.filter((p) => p.themes.get(0)?.kind === "pursuit").length,
    pursuits: people.map((p) => count(p, "pursuit")), curiosities: people.map((p) => count(p, "curiosity")),
    sectors: people.map((p) => new Set([...p.themes.keys()].map(sectorOf)).size),
    coverage: new Set(people.flatMap((p) => [...p.themes].filter(([, t]) => t.kind === "pursuit").map(([t]) => sectorOf(t)))).size,
    primaryCoverage: new Set(primary.map(sectorOf)).size, overlap: overlap / pairs };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r2 = (x) => Math.round(x * 100) / 100;
function spearman(xs, ys) {
  const rank = (v) => { const s = [...v].sort((a, b) => a - b); return v.map((x) => (s.indexOf(x) + s.lastIndexOf(x)) / 2); };
  const a = rank(xs), b = rank(ys), ma = mean(a), mb = mean(b);
  const c = a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0);
  return c / Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, y) => s + (y - mb) ** 2, 0));
}

// The study: 30 seeds, the full design and one ablation per Body piece, and
// genes against outcomes per Thread.
function main() {
  const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
  function study(label, options) {
    const runs = SEEDS.map((seed) => run({ ...options, seed }));
    const at = (d) => runs.map((r) => r.series[d]);
    const report = (d) => {
      const s = at(d);
      return { day: d + 1, pursuits: r2(mean(s.flatMap((x) => x.pursuits))), curiosities: r2(mean(s.flatMap((x) => x.curiosities))),
        inBand: r2(mean(s.flatMap((x) => x.pursuits.map((n, i) => n >= 3 && n <= 5 && x.curiosities[i] >= 3 && x.curiosities[i] <= 5 ? 1 : 0)))),
        sectorsPerThread: r2(mean(s.flatMap((x) => x.sectors))), coverage: r2(mean(s.map((x) => x.coverage))),
        primarySectors: r2(mean(s.map((x) => x.primaryCoverage))), overlap: r2(mean(s.map((x) => x.overlap))),
        stillPursuingShared: r2(mean(s.map((x) => x.theme0))) };
    };
    return { label, days: [0, 6, 13, 29, 59, 89].map(report), daily: Array.from({ length: 90 }, (_, d) => report(d)), runs };
  }

  const full = study("proposed", {});
  const ablations = [study("without fullness", { fullness: false }), study("without the pursuit itch", { itch: false }),
    study("without habituation", { habituation: Infinity }), study("no talk between Threads", { social: false })];

  // Genes against outcomes, per Thread, day 60, averaged over seeds.
  const names = Object.keys(GENES);
  const perThread = names.map((name, i) => ({ name, eg: GENES[name][0], mp: GENES[name][3], mg: GENES[name][2],
    pursuits: r2(mean(full.runs.map((r) => r.series.at(-1).pursuits[i]))),
    curiosities: r2(mean(full.runs.map((r) => r.series.at(-1).curiosities[i]))),
    sectors: r2(mean(full.runs.map((r) => r.series.at(-1).sectors[i]))) }));
  const out = { proposed: full.days, daily: full.daily, ablations: ablations.map((a) => ({ label: a.label, days: a.days, daily: a.daily })), perThread,
    genes: { "exploration gain ~ curiosities": r2(spearman(perThread.map((p) => p.eg), perThread.map((p) => p.curiosities))),
      "mastery gain ~ pursuits": r2(spearman(perThread.map((p) => p.mg), perThread.map((p) => p.pursuits))),
      "mastery persistence ~ pursuits": r2(spearman(perThread.map((p) => p.mp), perThread.map((p) => p.pursuits))),
      "exploration gain ~ sectors": r2(spearman(perThread.map((p) => p.eg), perThread.map((p) => p.sectors))) } };
  console.log(JSON.stringify(out, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
