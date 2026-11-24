// Knowing (ADR-0041 W2): what a Thread has come to know, as World fact, and
// the Body levels learning moves. Width is a subject new to it (novelty, for
// its inherited `exploration` urge); depth is going further in one it holds
// (competence, for `mastery_itch`). They are measured here with the shared
// Body level component; what they mean to the Body, hunger or satisfaction,
// and how strongly, is the regulation core's and the genome's, as for every
// other urge. Nothing here judges what is worth knowing; subjects are the
// catalogue's own words for a work.
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";

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

const WEEK_HOURS=168;
const NOVELTY_HALF_LIFE_HOURS=12;
const COMPETENCE_HALF_LIFE_HOURS=8;
const hoursBetween=(from,to)=>Math.max(0,(Date.parse(to)-Date.parse(from))/HOUR_MS);
const weekBefore=(at)=>new Date(Date.parse(at)-WEEK_HOURS*HOUR_MS).toISOString();
const learningOf=({experienceStore,threadId,at})=>experienceStore?.listLearning?.(threadId,{since:weekBefore(at),until:at})??[];

// How fresh something new is for this Thread (ADR-0041), as a Body level for
// its `exploration` urge: a subject new to it adds the most; an exchange it
// read as new half that, one read as somewhat new a quarter (a remark is less
// than a new subject, Nov 23: two "somewhat new" turns in a dull day were
// felt as a lift worth telling). It fades with the hours, more slowly the
// more persistent its inherited exploration. The Body's core reads it as it
// reads any novelty: below the species floor, hunger for something new;
// above it, something new has just answered it.
const NOVELTY_OF=Object.freeze({discovery:1,new:0.5,some_new:0.25});
export function noveltyLevel({experienceStore,threadId,at,persistence=0}){
  const readings=experienceStore?.listEngagementReadings?.(threadId,{since:weekBefore(at),until:at,limit:96})??[];
  const events=[...learningOf({experienceStore,threadId,at}).filter(item=>item.learning==="discovery")
    .map(item=>({at:item.at,size:NOVELTY_OF.discovery})),
    ...readings.filter(item=>NOVELTY_OF[item.reading]!==undefined&&item.reading!=="discovery")
      .map(item=>({at:item.at,size:NOVELTY_OF[item.reading]}))];
  return Math.round(bodyLevel({at,events,bound:{saturate:1},
    halfLife:inheritedHalfLife(NOVELTY_HALF_LIFE_HOURS*HOUR_MS,persistence)}).level*1e6)/1e6;
}

// How much going deeper in what it knows has lately satisfied it, as a Body
// level for its `mastery_itch` urge, fading with the hours as its inheritance
// makes it.
export function competenceLevel({experienceStore,threadId,at,persistence=0}){
  const events=learningOf({experienceStore,threadId,at}).filter(item=>item.learning==="depth").map(item=>({at:item.at,size:1}));
  return Math.round(bodyLevel({at,events,bound:{saturate:1},
    halfLife:inheritedHalfLife(COMPETENCE_HALF_LIFE_HOURS*HOUR_MS,persistence)}).level*1e6)/1e6;
}

// Books this Thread began and means to go on with, for its Body: how long
// since it last read on, and what each is (ADR-0041). One it set aside, or
// finished, leaves no itch.
export function unfinishedLearning({readings,at}){
  return Object.freeze(readings.filter(item=>item.status==="reading").slice(0,3).map(item=>Object.freeze({
    workRef:item.workRef,title:item.title,hoursSince:Math.round(hoursBetween(item.lastReadAt,at)*1000)/1000,
    evidenceRefs:Object.freeze([item.holdingRef])})));
}

// What it last learned from, within a day: the work it read, as it is
// called, and the subjects it met there. A World fact the felt words may
// name when the Body wants to tell of something; never a feeling itself.
const LATELY_HOURS=24;
export function latelyLearned({experienceStore,threadId,at,readings=[]}){
  const last=learningOf({experienceStore,threadId,at}).filter(item=>hoursBetween(item.at,at)<=LATELY_HOURS).at(-1);
  if(last===undefined)return null;
  const title=readings.find(item=>item.workRef===last.sourceRef)?.title??null;
  return title===null?null:Object.freeze({workRef:last.sourceRef,title,learning:last.learning,
    subjects:Object.freeze([...(last.subjects??[])].slice(0,3))});
}

// For observation only, never shown to a Thread: how many subjects it holds
// (width) and how far it has gone in its deepest (depth).
export function knowledgeMeasures(held){
  const counts=[...held.values()].map(item=>item.encounters);
  return Object.freeze({width:held.size,depth:counts.length===0?0:Math.max(...counts)});
}
