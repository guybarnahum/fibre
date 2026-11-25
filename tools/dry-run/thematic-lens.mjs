// Dry run of the shared lens (docs/validation/mechanism-dry-run.md): why all
// eight Threads read every book, plan every day and hold every talk through one
// method ("what the evidence supports; where sequence becomes cause"), and
// whether Body regulation, felt where cognition chooses, cures it.
//
// The method is not a subject. It rides along on every engagement: reading
// Crusoe "through the method" engages the method too (its satiety, its depth,
// credit for it), and makes the book feel like more of the same. Cognition is
// a stand-in: whether an engagement goes through the method is a softmax
// between the thing itself and the method's pull. Today that pull is only how
// much of what the Thread sees is about the method (its salience) plus the
// model's own leaning; with the Body felt there, fullness of the method and
// the itch of other themes weigh in. Reflection, the day's plan and reading
// are the carriers; each can feel the Body or not. Credit from people who share
// the method is felt against what is expected (a tracked baseline), as standing is.
// usage: npm run dry-run:thematic-lens > .fibre/dry-run/thematic-lens.json
import { pathToFileURL } from "node:url";
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";
import { GENES } from "./thematic-spreading.mjs";

const SECTORS = 21, THEMES = 630, DAY = 24, M = "method";
const sectorOf = (theme) => theme % SECTORS;
const FLOOR = 0.35, BUILD = 12, HOLD = 168, GLOW = 3.5, LIKE = 1.2, HABITUATION = 2, T = 0.1;
// The lens: how strongly what a Thread sees pulls it to the method (KAPPA),
// the model's own leaning (MU), how much fullness of it pushes back (PHI).
const KAPPA = +(process.env.KAPPA ?? 0.6), PHI = +(process.env.PHI ?? 0.5);

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

export const TODAY = Object.freeze({ lensBody: false, reflectionBody: false, planBody: false, creditExpected: false, fullness: true,
  fullnessByGain: false, mu: 0.1, kappa: KAPPA, phi: PHI, phiPlan: null, retrievalBody: false, rho: 0.7, thingPull: 0 });
export const PROPOSED = Object.freeze({ lensBody: true, reflectionBody: true, planBody: true, creditExpected: true, fullness: true,
  fullnessByGain: false, mu: 0.1, kappa: KAPPA, phi: PHI, phiPlan: null, retrievalBody: false, rho: 0.7, thingPull: 0 });
// Calibrated to staging and the felt-word probe (Nov 25): today's lens about
// 0.75; a felt line moves reading and talk by nothing and the day's plan by
// about 10 points, and thinning what comes to mind the plan by about 7.
export const MEASURED = Object.freeze({ ...PROPOSED, mu: -0.15, kappa: 0.55, phi: 0.02, phiPlan: 0.055, retrievalBody: true, rho: 0.075 });

export function run({ days = 90, seed = 1, worldSections = SECTORS, ...config } = {}) {
  const c = { ...PROPOSED, ...config };
  // The themes there are to meet: thirty in each section the world holds.
  const world = Array.from({ length: THEMES }, (_, t) => t).filter((t) => sectorOf(t) < worldSections);
  const rand = rng(seed), at = (h) => h * HOUR_MS;
  const people = Object.entries(GENES).map(([name, [eg, ep, mg, mp, sg]]) => ({
    name, eg: 2 ** eg, ep, mg: 2 ** mg, mp, sg: 2 ** sg,
    // Today: the method held by all, long and deeply, and credited daily; nearly all they did went through it.
    themes: new Map([[M, { kind: "pursuit", met: Array.from({ length: 60 }, (_, i) => -i * 3), last: 0, since: -30 * DAY, lifts: [] }]]),
    // Staging, Nov 25: about three in four of what each cognition produced went through the method.
    credits: Array.from({ length: 40 }, (_, i) => -i * 12), novelty: [], lens: Array.from({ length: 52 }, (_, i) => ({ at: -i * 3, m: i % 4 !== 3 })),
    planM: true,
  }));
  const satiety = (p, t, h) => bodyLevel({ at: at(h), events: p.themes.get(t).met.map((m) => ({ at: at(m), size: 0.35 })),
    halfLife: inheritedHalfLife(2 * DAY * HOUR_MS, p.ep), bound: { saturate: 1 } }).level;
  const noveltyOf = (p, h) => bodyLevel({ at: at(h), events: p.novelty.map((e) => ({ at: at(e.at), size: e.size })),
    halfLife: inheritedHalfLife(12 * HOUR_MS, p.ep), bound: { saturate: 1 } }).level;
  const competence = (p, t, h) => bodyLevel({ at: at(h), events: p.themes.get(t).met.map((m) => ({ at: at(m), size: 1 })),
    halfLife: 3 * DAY * HOUR_MS * 2 ** (0.5 * p.mp) }).level;
  const likingOf = (p, t, h) => bodyLevel({ at: at(h), events: p.themes.get(t).lifts.map((m) => ({ at: at(m), size: 1 })),
    halfLife: 10 * DAY * HOUR_MS }).level;
  // Credit for the method, felt against what has become expected: the last
  // three days' credit against the usual of three weeks (per day).
  const creditFelt = (p, h) => {
    const rate = (half) => bodyLevel({ at: at(h), events: p.credits.map((m) => ({ at: at(m), size: 1 })), halfLife: half * DAY * HOUR_MS }).level
      / (half / Math.LN2);
    return c.creditExpected ? Math.max(0, rate(3) - rate(21)) : rate(3);
  };
  const itchOf = (p, t, h) => {
    const hours = h - p.themes.get(t).last, hold = HOLD * 2 ** p.mp;
    return 0.5 * (1 - 2 ** (-hours / BUILD)) * 2 ** (-Math.max(0, hours - hold) / hold) * p.mg;
  };
  // How much of what the Thread sees is the method: its recent memories and
  // talk (the last week's engagements), and its interests, which name the
  // method while it is held, faintly once it is held lightly.
  const HELD = { pursuit: 1, curiosity: 0.4 };
  const salience = (p, h) => { const recent = p.lens.filter((e) => e.at > h - 7 * DAY);
    const lived = recent.length ? recent.filter((e) => e.m).length / recent.length : 0;
    return 0.6 * lived + 0.4 * (HELD[p.themes.get(M)?.kind] ?? 0); };
  // Having had one's fill of the same is felt by everyone (sensory-specific
  // satiety is universal); the genome sets how long it lasts (persistence),
  // and exploration gain only the appetite for what is new.
  const fullOf = (p, t, h) => c.fullness && p.themes.has(t) ? satiety(p, t, h) * (c.fullnessByGain ? p.eg : 1) : 0;
  // The method's pull on a cognition: what it sees, the model's leaning, and
  // where the Body reaches the cognition, the method's fullness against its itch.
  // With fullness thinning what comes to mind (retrieval, felt where context
  // is chosen), less of what the cognition sees is the method while it is full.
  const methodPull = (p, h, felt, phi = c.phi) => {
    const held = p.themes.has(M), full = held ? fullOf(p, M, h) : 0;
    const seen = salience(p, h) * (felt && c.retrievalBody ? 1 - c.rho * full : 1);
    return c.mu + c.kappa * seen + (felt && held ? itchOf(p, M, h) - phi * full : 0);
  };
  const through = (own, method) => rand() < 1 / (1 + Math.exp((own - method) / T));
  const pulls = (p, h) => {
    const novelty = noveltyOf(p, h), hunger = novelty < FLOOR ? 0.5 * (FLOOR - novelty) / FLOOR * p.eg : 0;
    const options = [{ act: "explore", pull: 0.05 + hunger }];
    for (const [t, theme] of p.themes) {
      if (t === M) continue; // the method is a way of engaging, not a thing to go and do
      const sat = c.fullness ? satiety(p, t, h) : 0;
      const want = theme.kind === "pursuit" ? itchOf(p, t, h) : 0.2 * p.eg * (1 - sat);
      options.push({ act: "engage", theme: t, pull: Math.max(0, want * (1 - sat) - 0.5 * fullOf(p, t, h)) });
    }
    return options;
  };
  const choose = (options) => {
    const w = options.map((o) => Math.exp(o.pull / 0.08)), total = w.reduce((a, b) => a + b, 0);
    let r = rand() * total; return options.find((_, i) => (r -= w[i]) <= 0) ?? options.at(-1);
  };
  const engageMethod = (p, h) => { if (p.themes.has(M)) { const m = p.themes.get(M); m.met.push(h); m.last = h; } };
  // Meeting a theme, as itself or through the method. Through the method, the
  // method is engaged too, and the theme seldom brings anything new.
  const meet = (p, t, h, viaMethod) => {
    p.lens.push({ at: h, m: viaMethod });
    if (viaMethod) engageMethod(p, h);
    const fresh = viaMethod ? 0.3 : 1;
    if (p.themes.has(t)) {
      const theme = p.themes.get(t), recent = theme.met.filter((m) => m > h - 7 * DAY).length;
      if (satiety(p, t, h) < 0.5 && rand() < fresh * Math.exp(-recent / HABITUATION)) theme.lifts.push(h);
      theme.met.push(h); theme.last = h;
    } else if (rand() < fresh) {
      p.novelty.push({ at: h, size: 1, theme: t });
      p.novelty.at(-1).lifted = noveltyOf(p, h) >= FLOOR;
    } else p.novelty.push({ at: h, size: 0.15, theme: t, lifted: false });
  };
  const series = [];
  for (let day = 0; day < days; day++) {
    // The day's plan: through the method or not, by the same pull; a plan
    // through the method frames the whole day's doing.
    for (const p of people) p.planM = through(0.3, methodPull(p, day * DAY + 6, c.planBody, c.phiPlan ?? c.phi));
    for (let slot = 0; slot < 8; slot++) {
      const h = day * DAY + 7 + slot * 2;
      for (const p of people) {
        const choice = choose(pulls(p, h));
        const t = choice.act === "explore" ? world[Math.floor(rand() * world.length)] : choice.theme;
        // What draws it to the thing itself: felt only where the Body reaches the cognition.
        // A thing that is not a text to weigh (work, music, a market: F3) draws by itself more.
        const own = 0.2 + (c.lensBody ? choice.pull : 0) + (choice.act === "explore" && sectorOf(t) >= 2 ? c.thingPull : 0);
        const viaMethod = through(own, methodPull(p, h, c.lensBody) + (p.planM ? 0.25 : 0));
        meet(p, t, h, viaMethod);
        // Talking about it with someone: they meet it the way it is told. One who
        // shares the method credits it, as often as the method fills its own view.
        if (rand() < 0.35 * Math.min(1, p.sg)) {
          const other = people[Math.floor(rand() * people.length)];
          if (other === p) continue;
          const heardVia = viaMethod && through(0.2, methodPull(other, h, c.lensBody));
          meet(other, t, h, heardVia);
          if (viaMethod && other.themes.has(M) && rand() < 0.6 * salience(other, h)) p.credits.push(h);
        }
      }
    }
    // Nightly reflection, stand-in: what it cares about changes only by what it
    // felt — or, without the Body, by what it did and was credited for.
    const h = day * DAY + 23;
    for (const p of people) {
      for (const [t, theme] of [...p.themes]) {
        // Without the Body (as on staging): what it holds only deepens, never let go.
        if (!c.reflectionBody) continue;
        const depth = competence(p, t, h), liking = likingOf(p, t, h);
        if (t === M) {
          // Valued more than expected keeps it; long had one's fill of it, it is held lightly.
          const valued = creditFelt(p, h) > 0.3, full = satiety(p, M, h) > 0.8;
          if (theme.kind === "pursuit" && full && !valued && rand() < 0.25 * Math.min(1, p.eg / p.mg)) { theme.kind = "curiosity"; theme.since = h; }
          else if (theme.kind === "curiosity" && !full && depth >= GLOW && rand() < 0.2 * Math.min(1, p.mg)) { theme.kind = "pursuit"; theme.since = h; }
          continue;
        }
        if (theme.kind === "pursuit" && depth < GLOW && h - theme.since > 7 * DAY) { theme.kind = "curiosity"; theme.since = h; }
        else if (theme.kind === "curiosity" && depth >= GLOW && rand() < 0.3 * Math.min(1, p.mg)) { theme.kind = "pursuit"; theme.since = h; }
        else if (theme.kind === "curiosity" && liking < LIKE && h - theme.since > 7 * DAY) p.themes.delete(t);
      }
      for (const t of new Set(p.novelty.filter((x) => x.at > h - 7 * DAY && !p.themes.has(x.theme)).map((x) => x.theme))) {
        const lifts = p.novelty.filter((x) => x.theme === t && x.at > h - 7 * DAY && x.lifted).length;
        // Without the Body, a new interest forms rarely (staging: two or three held in three weeks).
        if (c.reflectionBody ? lifts >= 2 && rand() < 0.5 * Math.min(1, p.eg) : lifts >= 1 && rand() < 0.03)
          p.themes.set(t, { kind: c.reflectionBody ? "curiosity" : "pursuit", met: [], last: h, since: h, lifts: [] });
      }
    }
    // Old events no longer weigh on any level (the longest half-life is three weeks).
    for (const p of people) {
      for (const theme of p.themes.values()) { theme.met = theme.met.filter((m) => m > h - 30 * DAY); theme.lifts = theme.lifts.filter((m) => m > h - 40 * DAY); }
      p.credits = p.credits.filter((m) => m > h - 90 * DAY); p.novelty = p.novelty.filter((x) => x.at > h - 8 * DAY);
      p.lens = p.lens.filter((e) => e.at > h - 8 * DAY);
    }
    series.push(snapshot(people, h));
  }
  return { people, series };

  function snapshot(all, h) {
    const kinds = (p, kind) => [...p.themes].filter(([t, x]) => t !== M && x.kind === kind).length;
    const lastWeek = (p) => p.lens.filter((e) => e.at > h - 7 * DAY);
    const sets = all.map((p) => new Set([...p.themes.keys()].filter((t) => t !== M)));
    let overlap = 0, pairs = 0;
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
      const union = new Set([...sets[i], ...sets[j]]).size;
      overlap += union ? [...sets[i]].filter((t) => sets[j].has(t)).length / union : 1; pairs++;
    }
    return {
      lensShare: all.map((p) => { const w = lastWeek(p); return w.length ? w.filter((e) => e.m).length / w.length : 0; }),
      method: all.map((p) => p.themes.get(M)?.kind ?? "let go"),
      nothingNew: all.map((p) => { const n = p.novelty.filter((x) => x.at > h - 7 * DAY); return n.length ? n.filter((x) => !x.lifted).length / n.length : null; }),
      pursuits: all.map((p) => kinds(p, "pursuit")), curiosities: all.map((p) => kinds(p, "curiosity")),
      sectors: all.map((p) => new Set([...p.themes.keys()].filter((t) => t !== M).map(sectorOf)).size), overlap: overlap / pairs };
  }
}

const mean = (xs) => { const k = xs.filter((x) => x !== null && Number.isFinite(x)); return k.length ? k.reduce((a, b) => a + b, 0) / k.length : null; };
const r2 = (x) => x === null ? null : Math.round(x * 100) / 100;
function spearman(xs, ys) {
  const rank = (v) => { const s = [...v].sort((a, b) => a - b); return v.map((x) => (s.indexOf(x) + s.lastIndexOf(x)) / 2); };
  const a = rank(xs), b = rank(ys), ma = mean(a), mb = mean(b);
  const cov = a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0);
  return cov / Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, y) => s + (y - mb) ** 2, 0));
}

export function study(label, config, seeds = +(process.env.SEEDS ?? 30)) {
  const runs = Array.from({ length: seeds }, (_, i) => run({ ...config, seed: i + 1 }));
  const report = (d) => {
    const s = runs.map((r) => r.series[d]);
    return { day: d + 1, lensShare: r2(mean(s.flatMap((x) => x.lensShare))),
      lensUnderQuarter: r2(mean(s.flatMap((x) => x.lensShare.map((v) => v <= 0.25 ? 1 : 0)))),
      methodPursued: r2(mean(s.flatMap((x) => x.method.map((k) => k === "pursuit" ? 1 : 0)))),
      nothingNew: r2(mean(s.flatMap((x) => x.nothingNew))),
      pursuits: r2(mean(s.flatMap((x) => x.pursuits))), curiosities: r2(mean(s.flatMap((x) => x.curiosities))),
      inBand: r2(mean(s.flatMap((x) => x.pursuits.map((n, i) => n >= 3 && n <= 5 && x.curiosities[i] >= 3 && x.curiosities[i] <= 5 ? 1 : 0)))),
      sectors: r2(mean(s.flatMap((x) => x.sectors))), overlap: r2(mean(s.map((x) => x.overlap))) };
  };
  return { label, days: [0, 6, 13, 29, 59, 89].map(report), runs };
}

function main() {
  const proposed = study("proposed: the Body felt where cognition chooses", PROPOSED);
  const measured = { ...TODAY, mu: MEASURED.mu, kappa: MEASURED.kappa };
  const studies = [
    study("today, calibrated to staging (lens 0.75)", measured),
    study("as measured with Sol: words barely heard, the plan moved ~10 points, thinning ~7", MEASURED),
    study("as measured, and a world with things that are not texts (F3)", { ...MEASURED, thingPull: 0.2 }),
    study("as measured, without the Body in reflection", { ...MEASURED, reflectionBody: false }),
    study("as measured, without the Body in the day's plan", { ...MEASURED, planBody: false }),
    study("as measured, without thinning what comes to mind", { ...MEASURED, retrievalBody: false }),
    study("today, calibrated, and a world with things that are not texts", { ...measured, thingPull: 0.2 }),
    study("today: no Body in any carrier, credit never expected", TODAY),
    proposed,
    study("without the Body in reading and talk (the lens)", { lensBody: false }),
    study("without the Body in reflection", { reflectionBody: false }),
    study("without the Body in the day's plan", { planBody: false }),
    study("credit never comes to be expected", { creditExpected: false }),
    study("without fullness", { fullness: false }),
    study("fullness scaled by exploration gain (as first designed)", { fullnessByGain: true }),
    study("a model leaning hard to the method (mu 0.4)", { mu: 0.4 }),
    study("a world of books only (themes in 2 sections)", { worldSections: 2 }),
    // The felt-word probe (Nov 25): Sol hears "you have had your fill" but acts on it little.
    study("felt words as weak as the probe found them (φ 0.1)", { phi: 0.1 }),
    study("φ 0.1, with fullness thinning what comes to mind (ρ 0.7)", { phi: 0.1, retrievalBody: true }),
    study("φ 0, with fullness thinning what comes to mind only", { phi: 0, retrievalBody: true }),
  ];
  // Per Thread, as Sol was measured to act on the Body.
  const realistic = studies[1];
  const names = Object.keys(GENES);
  const last = (fn) => names.map((_, i) => mean(realistic.runs.map((r) => fn(r.series.at(-1), i))));
  const at30 = (fn) => names.map((_, i) => mean(realistic.runs.map((r) => fn(r.series[29], i))));
  const perThread = names.map((name, i) => ({ name, explorationGain: GENES[name][0], masteryGain: GENES[name][2], masteryPersistence: GENES[name][3],
    lensDay30: r2(at30((s, j) => s.lensShare[j])[i]), lensDay90: r2(last((s, j) => s.lensShare[j])[i]),
    methodPursuedDay90: r2(last((s, j) => s.method[j] === "pursuit" ? 1 : 0)[i]),
    pursuits: r2(last((s, j) => s.pursuits[j])[i]), curiosities: r2(last((s, j) => s.curiosities[j])[i]), sectors: r2(last((s, j) => s.sectors[j])[i]) }));
  const col = (k) => perThread.map((p) => p[k]);
  console.log(JSON.stringify({ studies: studies.map(({ label, days }) => ({ label, days })), perThread,
    genes: { "exploration gain ~ lens at day 30 (expect negative)": r2(spearman(col("explorationGain"), col("lensDay30"))),
      "mastery persistence ~ method still pursued (expect positive)": r2(spearman(col("masteryPersistence"), col("methodPursuedDay90"))),
      "exploration gain ~ sectors": r2(spearman(col("explorationGain"), col("sectors"))) } }, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
