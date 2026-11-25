---
id: validation-mechanism-dry-run
status: accepted
last-reviewed: 2026-11-24
canonical: true
---

# Dry-running a Body mechanism before building it

## Purpose

A behaviour we want from Threads must emerge from Body regulation: genes shape drives, drives are felt, and what is felt bends what a Thread does and comes to care about (see **Shared mechanisms** in [`AGENTS.md`](../../AGENTS.md)). Whether a proposed mechanism produces the outcome cannot be judged by reading it. Feedback loops run away, bounds are missing, and genes turn out not to matter.

A dry run catches this before any code reaches the World. It simulates the proposed mechanism with the living Threads' real genes and Fibre's own Body level component, starting from where they are now.

The first use proved the point. The first design for thematic spreading (fullness and the pursuit itch) let pursuits grow to 15 per Thread by day 60. The dry run found it; two more Body levels fixed it before anything was built ([`tools/dry-run/thematic-spreading.mjs`](../../tools/dry-run/thematic-spreading.mjs)).

## When

Before building any new or changed Body mechanism that claims an emergent behaviour or outcome: a drive, a Body level, how reflection changes what a Thread holds, or a coupling between them. Ordinary fixes and wiring do not need one.

## The method

1. **The outcome, per Thread.** State what each Thread should come to, as a measurable quantity with a band. For example: "3 to 5 pursuits and as many curiosities; their main pursuits spread across industry sections". Also state the true-to-life ground truth it rests on, for example "varied diets come from sensory-specific satiety". Population figures are context, never the verdict.
2. **The chain.** Draw it from genes to World facts, Body levels, drives, felt words, what the Thread does, the new World facts, and reflection. Name, for every Body level:
   - the World fact it measures;
   - the existing urge family its drive belongs to (a new family needs an ADR);
   - the gene position that shapes it.
3. **The state machine.** List the states of the thing that changes (for example: a theme not held, a curiosity, a pursuit) and every transition. Each transition names the felt cause that moves it, and the gene that makes it more or less likely. A transition with no felt cause is a rule; redesign it.
4. **The dry run.**
   - **Genes:** the living Threads' gene positions, from the Body panel's `genetics`. Use the genes, never invented personalities.
   - **Body levels:** `bodyLevel` and `inheritedHalfLife` from `core/src/body-level.mjs`, and the core's species constants. Do not reimplement them.
   - **Cognition stand-in:** a choice is likelier the stronger its felt pull (softmax over pulls, with a stated temperature), never certain.
   - **Reflection stand-in:** it acts only on what the Body felt, with chance.
   - **Start from today:** the Threads' present state, from staging evidence.
   - **World stand-in:** state its size and shape (for example: 630 themes, 30 in each of the 21 ISIC sections), because a world that is too small or too uniform shows the wrong things.
5. **Run it long and often.**
   - At least 30 seeds.
   - At least three times the slowest half-life, until the daily series is flat.
   - Report daily means and per-Thread results at the end.
6. **Check it.**
   - **Reached and stable:** the outcome arrives and holds, with no runaway growth and no collapse.
   - **Per Thread:** the share of Threads inside the band, and the spread around it.
   - **Genes:** a rank correlation of each gene position with the outcome it should shape, in the expected direction. No correlation means the gene is decorative here.
   - **Ablations:** remove each piece of the mechanism in turn. Each must change something, or it is cut. Name what each one does, for example "without fullness, the shared theme stays and Threads converge".
   - **Failure modes:** runaway counts, convergence to one, oscillation, and dependence on a single seed.
7. **Calibrate as species constants.** Thresholds and half-lives found by the dry run become species constants, recorded with their values. Staging evidence later adjusts them. Never fit a constant per Thread.
8. **Say what it cannot prove.** In particular, whether the model behind each Thread acts on the felt words. Before building, probe it: `npm run model:felt-probe` asks recorded requests again with the felt line the mechanism would add, and compares the answers by meaning. After building, it is link 3 of [`thread-chain.md`](thread-chain.md), measured on staging. Also say what the World stand-in leaves out.
9. **Record it.**
   - **In the design or ADR:** the chain, the state machine, the dry run's results with its ablations and gene correlations, what it changed in the design, and the command that reproduces it.
   - **Script:** under `tools/dry-run/<capability>.mjs`, named for the capability.
   - **Command:** `npm run dry-run:<capability>`.

## After the build

The live chain read ([`thread-chain.md`](thread-chain.md)) checks the same quantities, Thread by Thread, on staging. Where the World and the dry run disagree, the World is right. Update the dry run's stand-ins, and only then the mechanism.

## Dry runs so far

| Capability | Command | Finding |
|---|---|---|
| Thematic spreading: pursuits and curiosities from the Body | `npm run dry-run:thematic-spreading` | Fullness and the itch alone ran away (15 pursuits). Adding depth felt as progress, and habituation of curiosities, settles the eight Threads at about 5 pursuits and 4 curiosities by days 40–60. Their main pursuits spread from 1 industry section to about 4. Mastery persistence tracks pursuits (ρ 0.95); exploration gain tracks curiosities (ρ 0.85). Revised Nov 25: fullness is felt by everyone (sensory-specific satiety is universal), not scaled by exploration gain; the outcome holds. Removing the pursuit itch changes nothing (4.9 pursuits, 3.7 curiosities), so it is cut from the build. |
| The shared lens: one method read into every book, plan and talk | `npm run dry-run:thematic-lens` | Calibrated to staging: with no Body where cognition chooses, every engagement stays inside the method and 70% bring nothing new, indefinitely. With fullness felt in reading, talk and the day's plan, and reflection feeling the Body, the lens falls from 1.0 to 0.38 in two weeks and 0.28 by day 30 (each Thread 0.07–0.48); nothing new falls to 12%; half the Threads keep the method as a pursuit, the rest hold it lightly or let it go. The Body in reading and talk, and fullness, are each essential (without either the lens stays above 0.9); the day's plan halves the time; reflection bounds what is held (without it, 39 interests and none let go). A model that leans hard on its own toward the method (μ 0.4) is not cured: measure that before building. A world of books alone cures the lens but stays in 2 industry sections. Probed before building (`npm run model:felt-probe`, Nov 25): Sol hears "you have had your fill of it" and goes on through the method ("…has had enough of frames for now. Still, …"); the lens fell 10 points in plans, none in reading or talk. With felt words that weak (φ 0.1) the dry run is not cured (0.94 at day 30); fullness thinning what comes to mind takes it to 0.54. Felt words alone are not enough with this model: the next probe arms test thinning, and the prompts' own "felt, not an order". |
