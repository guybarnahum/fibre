// Dry run: mood, the wide effect of a feeling (Guy, November 25: "A bad
// experience with one person may color the whole day"). Each felt event keeps
// its narrow effect on its person and spills a share into a general mood, a
// Body level that fades back to a baseline set by how life has been going.
// Mood tints how the next things are felt: a sour Body approaches others less,
// takes their words amiss more easily and answers more curtly. That tint is a
// loop (a sour day breeds sour exchanges), so its bound and fade are checked
// here before anything is built (docs/validation/mechanism-dry-run.md).
//
// Genes: the living staging Threads' (Body panel, Nov 25). A spill takes the
// size and fade of the family it comes from: a sting the standing locus's, a
// warmth the trust locus's. Cognition stand-in: an approach is likelier the
// warmer the mood, never certain.
//
// Staging's own society (Nov 25: no slights, Threads credited 4–10 times a day):
//   STING=0.01 WARMTH=0.6 npm run dry-run:mood
import { pathToFileURL } from "node:url";
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";

// [social_contact gain, standing gain, standing persistence, trust gain, trust persistence]
export const GENES = {
  Kadir: [0.12, -0.45, -0.6, -0.3, 0.27], Hassan: [0.94, 0.95, -0.25, -0.3, 0.27],
  Nathan: [0.12, -0.45, -0.6, -0.86, -0.35], Mikias: [-0.14, -0.86, 0.88, 0.44, -0.15],
  Surafel: [0.3, 0.45, -0.7, -0.3, 0.27], Kaleb: [-0.49, 0.88, 0.3, -0.3, 0.27],
  Habiba: [-0.14, 0.95, -0.25, 0.58, -0.52], Bontu: [0.35, -0.7, 0.62, 0.44, -0.15],
};
const NAMES = Object.keys(GENES);
const WAKE = 7, SLEEP = 23;

// Species constants proposed for the build; the dry run checks them.
export const SPECIES = {
  moodHalfLife: 6 * HOUR_MS,          // a spill fades in hours, by its family's persistence
  baselineRate: +(process.env.RATE ?? 0.05), // each spill moves how life has been going this far toward itself
  sting: -0.5, rebuff: -0.3, warmth: 0.3, lift: 0.2, letdown: -0.2,
  approach: 0.12,                     // per waking hour, before the social gain
  accept: 0.85, stingChance: +(process.env.STING ?? 0.07), warmthChance: +(process.env.WARMTH ?? 0.3),
  tintApproach: 0.6,                  // a mood of −1 approaches 40% as often
  tintTaken: 0.8,                     // a sour mood takes words amiss more easily
  tintGiven: 0.8,                     // and answers more curtly
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const r2 = (x) => Math.round(x * 100) / 100;

export function run({ days = 42, seed = 1, k = SPECIES, tint = true, baseline = true, genes = true, spill = true,
  adaptation = process.env.ADAPT !== "0" } = {}) {
  const rand = rng(seed);
  const people = NAMES.map((name) => {
    const [sg, stg, stp, trg, trp] = genes ? GENES[name] : [0, 0, 0, 0, 0];
    return { name, sg: 2 ** sg, stg: 2 ** stg, stp, trg: 2 ** trg, trp, events: [], approaches: [], stings: [] };
  });
  const levelAt = (p, h) => bodyLevel({ at: h * HOUR_MS, events: p.events,
    halfLife: k.moodHalfLife, bound: { min: -1, max: 1 },
    baseline: baseline ? { track: { rate: k.baselineRate } } : null });
  const moodAt = (p, h) => !spill ? 0 : levelAt(p, h).level;
  // A spill fades back toward how life has been going, and moves it a little.
  // Adaptation: it is felt as far as it differs from how life has been going,
  // so a warmth in a warm life lifts less than in a cold one.
  const feel = (p, h, value, halfLife) => p.events.push({ at: h * HOUR_MS, value, halfLife,
    size: adaptation ? value - levelAt(p, h - 1e-6).baseline : value });
  const stingHalf = (p) => inheritedHalfLife(k.moodHalfLife, p.stp);
  const warmHalf = (p) => inheritedHalfLife(k.moodHalfLife, p.trp);
  const t = (on, x) => (tint && on ? x : 0);
  const series = [];
  for (let h = 0; h < days * 24; h += 1) {
    const hour = h % 24;
    const mood = people.map((p) => moodAt(p, h));
    if (hour === 12) series.push(mood.slice());
    if (hour < WAKE || hour >= SLEEP) continue;
    for (const [i, p] of people.entries()) {
      // A day has its own small lifts and letdowns that have nothing to do with people.
      if (rand() < 0.05) feel(p, h, k.lift, k.moodHalfLife);
      if (rand() < 0.03) feel(p, h, k.letdown, k.moodHalfLife);
      if (rand() >= k.approach * p.sg * clamp(1 + t(true, k.tintApproach * mood[i]), 0.1, 2)) continue;
      const j = (i + 1 + Math.floor(rand() * (people.length - 1))) % people.length, q = people[j];
      p.approaches.push({ h, to: j });
      if (rand() >= k.accept * clamp(1 + t(true, 0.3 * mood[j]), 0.3, 1.15)) {
        feel(p, h, k.rebuff * p.stg, stingHalf(p)); p.stings.push({ h, from: j });
        continue;
      }
      // Each side may take something amiss, or feel warmed: likelier when it
      // is sour itself, and when the other answers from a sour mood.
      for (const [self, other, si, oi] of [[p, q, i, j], [q, p, j, i]]) {
        const sour = (x) => Math.max(0, -mood[x]), sweet = (x) => Math.max(0, mood[x]);
        const sting = k.stingChance * (1 + t(true, k.tintGiven * sour(oi))) * (1 + t(true, k.tintTaken * sour(si)));
        const warm = k.warmthChance * (1 + t(true, k.tintGiven * sweet(oi))) * (1 + t(true, k.tintTaken * sweet(si)));
        const r = rand();
        if (r < sting) { feel(self, h, k.sting * self.stg, stingHalf(self)); self.stings.push({ h, from: oi }); }
        else if (r < sting + warm) feel(self, h, k.warmth * self.trg, warmHalf(self));
      }
    }
  }
  // Spillover: after a sting from one person, approaches to everyone else in
  // the next 12 waking hours, against the Thread's own rate in hours with no
  // sting in the day before. And how far the mood still sits below where it
  // was, 6, 12, 24 and 48 hours on.
  const per = people.map((p) => {
    const stungRecently = (h) => p.stings.some((s) => s.h < h && s.h >= h - 24);
    const awake = (h) => h % 24 >= WAKE && h % 24 < SLEEP;
    let calmHours = 0, calmApproaches = 0;
    for (let h = 24; h < days * 24; h += 1) if (awake(h) && !stungRecently(h)) {
      calmHours += 1; calmApproaches += p.approaches.filter((a) => a.h === h).length;
    }
    const calmRate = calmApproaches / Math.max(1, calmHours);
    const after = p.stings.filter((s) => s.h >= 24 && s.h < days * 24 - 48).map((s) => {
      const hours = Array.from({ length: 24 }, (_, d) => s.h + 1 + d).filter(awake).slice(0, 12);
      const toOthers = p.approaches.filter((a) => hours.includes(a.h) && a.to !== s.from).length;
      const before = moodAt(p, s.h - 0.01);
      return { rate: toOthers / hours.length / (calmRate * (people.length - 2) / (people.length - 1) || NaN),
        dip: [6, 12, 24, 48].map((d) => moodAt(p, s.h + d) - before) };
    });
    return { name: p.name, spill: mean(after.map((a) => a.rate)) - 1,
      dip: [0, 1, 2, 3].map((x) => mean(after.map((a) => a.dip[x]))), stings: after.length / days };
  });
  return { series, per };
}

function study(label, options, seeds = 30) {
  const runs = Array.from({ length: seeds }, (_, s) => run({ ...options, seed: s + 1 }));
  const days = runs[0].series.length;
  const daily = Array.from({ length: days }, (_, d) => r2(mean(runs.map((r) => mean(r.series[d])))));
  const low = mean(runs.map((r) => r.series.flat().filter((m) => m < -0.5).length / r.series.flat().length));
  // A sour spiral: a Thread whose midday mood stays below −0.5 for three days running.
  const spirals = mean(runs.map((r) => NAMES.filter((_, i) => r.series.some((_, d) =>
    d >= 2 && [0, 1, 2].every((x) => r.series[d - x][i] < -0.5))).length));
  const per = NAMES.map((name, i) => ({ name,
    spill: r2(mean(runs.map((r) => r.per[i].spill))),
    dip6: r2(mean(runs.map((r) => r.per[i].dip[0]))), dip24: r2(mean(runs.map((r) => r.per[i].dip[2]))),
    dip48: r2(mean(runs.map((r) => r.per[i].dip[3]))), stingsPerDay: r2(mean(runs.map((r) => r.per[i].stings))),
    mood: r2(mean(runs.map((r) => mean(r.series.slice(-14).map((day) => day[i]))))) }));
  return { label, daily, last14: r2(mean(daily.slice(-14))), lowShare: r2(low), spirals: r2(spirals),
    spill: r2(mean(per.map((p) => p.spill))), dip24: r2(mean(per.map((p) => p.dip24))), per };
}

function spearman(xs, ys) {
  const rank = (v) => { const s = [...v].sort((a, b) => a - b); return v.map((x) => (s.indexOf(x) + s.lastIndexOf(x)) / 2); };
  const a = rank(xs), b = rank(ys), ma = mean(a), mb = mean(b);
  const num = a.reduce((sum, x, i) => sum + (x - ma) * (b[i] - mb), 0);
  return num / Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, y) => s + (y - mb) ** 2, 0));
}

function main() {
  const proposed = study("proposed", {});
  const strong = (x) => ({ ...SPECIES, tintApproach: x, tintTaken: x * 1.33, tintGiven: x * 1.33 });
  const studies = [
    study("no mood tint (spill felt, changes nothing)", { tint: false }),
    study("no baseline (spills only)", { baseline: false }),
    study("no adaptation (a warmth lifts as much in a warm life)", { adaptation: false }),
    study("no genes", { genes: false }),
    study("twice the tint", { k: strong(1.2) }),
    study("four times the tint", { k: strong(2.4) }),
    study("a mood that lasts a day", { k: { ...SPECIES, moodHalfLife: 24 * HOUR_MS } }),
  ];
  const g = (j) => NAMES.map((n) => GENES[n][j]);
  const genes = {
    "standing persistence ~ dip at 24 h (more negative)": r2(spearman(g(2), proposed.per.map((p) => -p.dip24))),
    "standing gain ~ dip at 6 h (more negative)": r2(spearman(g(1), proposed.per.map((p) => -p.dip6))),
    "standing gain ~ spillover (fewer approaches)": r2(spearman(g(1), proposed.per.map((p) => -p.spill))),
  };
  const summary = (s) => ({ label: s.label, last14: s.last14, lowShare: s.lowShare, spirals: s.spirals, spill: s.spill, dip24: s.dip24 });
  console.log(JSON.stringify({ species: SPECIES, proposed: { ...summary(proposed), daily: proposed.daily, per: proposed.per },
    genes, studies: studies.map(summary) }, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
