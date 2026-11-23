// Knowing (ADR-0041 W2): what a Thread has come to know, as World fact, and
// learning as something the Body feels. Width is a subject new to it, met
// with the joy of discovery (its appetite for ideas, `exploration`); depth is
// going further in one it holds, with the glow of competence (`mastery_itch`).
// Both are Body levels that rise and fade, as strong as its genome makes
// them. Nothing here judges what is worth knowing; subjects are the
// catalogue's own words for a work.
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";

const LEARNING_HALF_LIFE_HOURS=8;
const RECENT_MS=2*86_400_000;
// Catalogue groupings that name a collection, not what a work is about.
const COLLECTION=/^(best books|harvard classics|banned books|movie books|bestsellers|gutenberg|contemporary reviews)\b/iu;

// The subjects a work is about, as the catalogue words them: a heading's
// first part, so "Tarzan (Fictitious character) -- Fiction" is Tarzan.
export function subjectsOf(work){
  const seen=new Map();
  for(const raw of work?.subjects??[]){
    const subject=String(raw).replace(/^Browsing:\s*/iu,"").split(" -- ")[0]
      .replace(/\s*\([^)]*\)\s*$/u,"").trim();
    if(!subject||COLLECTION.test(subject))continue;
    const key=subject.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/gu,"")
      .replace(/[^a-z0-9]+/gu," ").trim();
    if(key&&!seen.has(key))seen.set(key,Object.freeze({key,subject:subject.slice(0,120)}));
  }
  return Object.freeze([...seen.values()].slice(0,6));
}

// What reading a work was for this Thread, from what it already held: a
// discovery when a subject is new to it, deeper when every subject is known
// or it goes on with a book it began.
export function learningFromReading({held,work,continuing}){
  const subjects=subjectsOf(work);
  if(subjects.length===0)return null;
  const unknown=subjects.filter(item=>!held.has(item.key));
  return Object.freeze({learning:!continuing&&unknown.length>0?"discovery":"depth",subjects});
}

// How strongly this Body is moved by a kind of learning: its inherited gain
// for the urge that seeks it, and for width more when that urge is turned
// toward ideas.
function strength(locus,{toward=null}={}){
  if(locus===null)return 1;
  const leaning=toward===null||locus.orientation===toward?1:0.6;
  return Math.max(0.25,(1+0.5*(locus.gain??0))*leaning);
}

// The joy of discovery and the glow of competence, now: 0 none, toward 1.
export function learningLevels({events,at,exploration=null,mastery=null}){
  const level=(kind,locus,toward)=>{
    const size=strength(locus,{toward});
    const halfLife=inheritedHalfLife(LEARNING_HALF_LIFE_HOURS*HOUR_MS,locus?.persistence??0);
    const value=bodyLevel({at,halfLife,events:events.filter(item=>item.learning===kind)
      .map(item=>({at:item.at,size:0.4*size})),bound:{saturate:1}}).level;
    return Math.round(value*1e6)/1e6;
  };
  return Object.freeze({discovery:level("discovery",exploration,"ideas"),
    competence:level("depth",mastery,null)});
}

export const learningSince=(at)=>new Date(Date.parse(at)-RECENT_MS).toISOString();

const WEEK_HOURS=168;
const DROUGHT_HALF_HOURS=24;
const hoursBetween=(from,to)=>Math.max(0,(Date.parse(to)-Date.parse(from))/HOUR_MS);

// How long since anything was new to this Thread (ADR-0041), as a fact for
// its Body: from the latest discovery it made and the latest exchange it
// read as new; one it read as somewhat new counts for half. Nothing new in a
// week is a week. 0 just now, toward 1 long ago; how hungry that makes it is
// its genome's, in the Body's core.
export function droughtOf({experienceStore,threadId,at}){
  const since=new Date(Date.parse(at)-WEEK_HOURS*HOUR_MS).toISOString();
  const readings=experienceStore?.listEngagementReadings?.(threadId,{since,until:at,limit:96})??[];
  const discoveries=(experienceStore?.listLearning?.(threadId,{since,until:at})??[]).filter(item=>item.learning==="discovery");
  const latest=(items)=>items.reduce((best,item)=>best===null||item.at>best?item.at:best,null);
  const fullyNew=latest([...discoveries,...readings.filter(item=>item.reading==="new")]);
  const partlyNew=latest(readings.filter(item=>item.reading==="some_new"));
  const hours=Math.min(fullyNew===null?WEEK_HOURS:hoursBetween(fullyNew,at),
    partlyNew===null?WEEK_HOURS:2*hoursBetween(partlyNew,at),WEEK_HOURS);
  return Math.round((1-2**(-hours/DROUGHT_HALF_HOURS))*1e6)/1e6;
}

// Books this Thread began and means to go on with, for its Body: how long
// since it last read on, and what each is (ADR-0041). One it set aside, or
// finished, leaves no itch.
export function unfinishedLearning({readings,at}){
  return Object.freeze(readings.filter(item=>item.status==="reading").slice(0,3).map(item=>Object.freeze({
    workRef:item.workRef,title:item.title,hoursSince:Math.round(hoursBetween(item.lastReadAt,at)*1000)/1000,
    evidenceRefs:Object.freeze([item.holdingRef])})));
}

const LIFTED=Object.freeze([[0.15,null],[0.5,"Something new you came across has lifted you."],
  [1.01,"Discovering something new has lit you up."]]);
const GLOW=Object.freeze([[0.15,null],[0.5,"Going further in what you know gives you a quiet satisfaction."],
  [1.01,"Getting deeper into something you know is deeply satisfying right now."]]);
const band=(steps,value)=>steps.find(([upper])=>value<upper)[1];

// The felt words, for the Body's account of itself.
export function feltLearning(levels){
  if(!levels)return [];
  return [band(LIFTED,levels.discovery),band(GLOW,levels.competence)].filter(Boolean);
}

// For observation only, never shown to a Thread: how many subjects it holds
// (width) and how far it has gone in its deepest (depth).
export function knowledgeMeasures(held){
  const counts=[...held.values()].map(item=>item.encounters);
  return Object.freeze({width:held.size,depth:counts.length===0?0:Math.max(...counts)});
}
