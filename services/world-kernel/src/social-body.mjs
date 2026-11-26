// The social Body's World evidence (ADR-0036): how well this Thread knows
// another person and how up to date it is with them, how far it trusts them
// and what they did to it, and how spent it is by lived talk and messages.
// Mechanical and read-only, from World records alone; the Thread feels the
// result through its own urge loci and decides for itself what to do.

import { bodyLevel, DAY_MS, fade, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";
import { talksOf, tookItsMind } from "./engagement.mjs";

const days=(from,to)=>(Date.parse(to)-Date.parse(from))/DAY_MS;

// Knowing: what each lived contact taught, by its depth. It barely fades (a
// contact's weight halves over two years) and the first meetings teach most.
const DEPTH=Object.freeze({noticed:0.25,message:0.5});
const depthOf=(contact)=>contact.kind==="conversation"?Math.min(2,1+0.1*contact.turns):DEPTH[contact.kind];
const KNOWING_HALF_LIFE_DAYS=730;
const KNOWING_SCALE=4;
// Being current: how up to date this Thread is with their life, halving
// every two weeks apart. Only someone known can be out of date.
const CURRENT_HALF_LIFE_DAYS=14;

// The battery: each turn of talk costs the Body in proportion to how
// unknown the other is, a little for catching up, plus the harm they might
// do. Expected harm starts at the same species baseline toward everyone and
// falls as trust is lived.
const TURN_COST=0.03;
const STALE_COST=0.25;
const EXPECTED_HARM=0.5;
const MESSAGE_WEIGHT=0.5;
const RECOVERY_HALF_LIFE_MS=90*60_000;
const WINDOW_MS=12*3_600_000;

// Trust is built safety (they could have hurt me, and did not), held down by
// the wounds they left. Built safety never expires. Four units of it make a
// person half-trusted.
const TRUST_SCALE=4;
const SAFE_ACTS=Object.freeze(["accepted","kept","opened","repaired"]);
// What counts as evidence of safety, and how much a harm weighs, is
// inherited (the trust locus's orientation); without one, the species way.
const SPECIES_WEIGHTS=Object.freeze({contact:1,accepted:1,kept:1,opened:1,repaired:1,declined:1,broken:2,closed:2,
  slighted:1,slighted_publicly:2});
const TRUST_WEIGHTS=Object.freeze({
  reliability:Object.freeze({...SPECIES_WEIGHTS,contact:0.5,accepted:2,kept:3,broken:3}),
  warmth:Object.freeze({...SPECIES_WEIGHTS,contact:1.5,declined:2,slighted:1.5,slighted_publicly:3}),
  reciprocity:Object.freeze({...SPECIES_WEIGHTS,accepted:2,opened:2,declined:1.5}),
  familiarity:Object.freeze({...SPECIES_WEIGHTS,contact:2,broken:1,closed:1}),
});
// A harm's severity: trivial, moderate, serious (grave harms arrive with the
// confidence, care and commitment doors). Grave and serious wounds leave a
// scar nothing heals; the rest heals over a time that grows with severity.
// A slight this Thread perceived (ADR-0037) is a harm too: trivial when it
// was private, and moderate before others, where it cost it standing.
const SEVERITY=Object.freeze({declined:1,slighted:1,broken:2,slighted_publicly:2,closed:4});
// A private slight spared one a worse one: that consideration is safety too.
const SPARED=0.5;
const SCAR=Object.freeze({1:0,2:0,4:0.25,8:0.6});
const healingHalfLifeDays=(severity)=>3*severity**2;
const REPEAT_WITHIN_DAYS=365;
// A new harm that re-opens a real part of an old wound is felt as such for a
// few days.
const REVIVED_ABOVE=0.25;
const REVIVED_FOR_DAYS=7;

// Knowing and being current, over the same contacts (body levels): what
// each taught accumulates into a baseline that fades over years; being up to
// date is the latest contact, fading over two weeks.
function familiarityOf(contacts,at){
  const level=bodyLevel({at,events:contacts.map(contact=>({at:contact.at,toBaseline:depthOf(contact),size:1})),
    baseline:{accumulate:{halfLife:KNOWING_HALF_LIFE_DAYS*DAY_MS}},
    halfLife:CURRENT_HALF_LIFE_DAYS*DAY_MS,combine:"max"});
  return {knowing:1-2**(-level.baseline/KNOWING_SCALE),current:level.deviation};
}

// The wounds one person left, lived in order: each harm by its severity,
// weighing more from someone trusted, when repeated, and on top of an old
// history; each healing by time at this Body's inherited pace and by their
// later good conduct (never the scar); each new harm re-opening part of what
// had healed.
function livedTrust({contacts,acts,at,weights,pace}){
  const events=[...contacts.map(contact=>({at:contact.at,safe:depthOf(contact)*weights.contact})),
    ...acts.flatMap(act=>SEVERITY[act.kind]!==undefined
      ?[{at:act.occurredAt,harm:act.kind},...(act.kind==="slighted"?[{at:act.occurredAt,safe:SPARED}]:[])]
      :SAFE_ACTS.includes(act.kind)?[{at:act.occurredAt,safe:weights[act.kind]}]:[])]
    .sort((a,b)=>a.at.localeCompare(b.at));
  const wounds=[];
  let built=0,clock=null,revivedAt=null;
  const open=()=>wounds.reduce((sum,wound)=>sum+wound.scar+wound.healable,0);
  const trustNow=()=>(1-2**(-built/TRUST_SCALE))*2**(-open());
  const advance=(to)=>{
    if(clock!==null)for(const wound of wounds)
      wound.healable=fade(wound.healable,Date.parse(to)-Date.parse(clock),healingHalfLifeDays(wound.severity)*pace*DAY_MS);
    clock=to;
  };
  for(const event of events){
    advance(event.at);
    if(event.safe!==undefined){
      built+=event.safe;
      // A kindness heals little while the wound is fresh.
      for(const wound of wounds)
        wound.healable*=1-Math.min(1,0.1*event.safe*(1-(wound.scar+wound.healable)/wound.weight));
      continue;
    }
    const severity=SEVERITY[event.harm];
    const repeats=wounds.filter(wound=>wound.kind===event.harm&&days(wound.at,event.at)<=REPEAT_WITHIN_DAYS).length;
    const weight=severity*(weights[event.harm]/SPECIES_WEIGHTS[event.harm])*(1+trustNow())/4
      *1.5**repeats*(1+0.5*open());
    for(const wound of wounds){
      const healed=wound.weight-wound.scar-wound.healable;
      const reopened=Math.min(healed,healed*0.5*Math.min(1,severity/wound.severity)*(wound.kind===event.harm?2:1));
      wound.healable+=reopened;
      if(reopened>=REVIVED_ABOVE)revivedAt=event.at;
    }
    wounds.push({kind:event.harm,severity,at:event.at,weight,scar:weight*SCAR[severity],healable:weight*(1-SCAR[severity])});
  }
  advance(at);
  const held=open();
  return {trust:(1-2**(-built/TRUST_SCALE))*2**(-held),hurt:1-2**(-held),
    revived:revivedAt!==null&&days(revivedAt,at)<=REVIVED_FOR_DAYS};
}

const NO_ONE=Object.freeze({knowing:0,staleness:0,trust:0,warmth:0,promise:0,hurt:0,revived:false,status:0,treated:0,expectedFrom:0,lately:Object.freeze([]),
  refusedAt:null,
  apartDays:null,apartInPersonDays:null});

// Status (ADR-0037, revised in C3b): two signals toward each person, kept
// apart. How their treatment places me (treated): it starts level and moves a
// fifth of the way toward what each episode showed, twice that for the act
// this Body's standing orientation cares about; it is never stubborn, simply
// what the world has been saying. Where I hold that I stand with them (held):
// my inherited self-view (selfRegard), revised by how I am treated only as far
// as my inherited stubbornness lets it; a reasonable Body adapts, never fully.
// The Body behaves as if what it holds is shared, so its expectations, and
// the slights it feels, come from held. Neither fades with absence.
// Each act lifts its actor above the other (+) or the other above its actor
// (−); ordinary regard lifts no one.
const LIFT=Object.freeze({talked_over:1,corrected_publicly:1,left_out:1,corrected:0.5,overlooked:0.5,
  held_ground:0.5,ordinary:0,gave_way:-1,credited:-0.5,asked_advice:-0.5});
const BEARS_ON=Object.freeze({talked_over:"deference",held_ground:"deference",gave_way:"deference",
  corrected:"competence",corrected_publicly:"competence",asked_advice:"competence",
  left_out:"belonging",overlooked:"recognition",credited:"recognition"});
const PUBLIC_ACTS=Object.freeze(["corrected_publicly","left_out"]);
const LEARNING=0.2;
const SELF_VIEW=0.4;
const REVISED_SPECIES=0.5,REVISED_RANGE=0.4;
const SLIGHT_FRESH_DAYS=1;
// A sting or a warmth (body levels B2) fades back at this Body's standing
// persistence: half of it in twelve hours for the species, longer for a Body
// that holds on to such things. After a week nothing is left to feel.
export const SLIGHT_GAP=0.25;
const STING_HALF_LIFE_MS=12*HOUR_MS;
const STING_DAYS=7;
export const stingHalfLife=(standingLocus)=>inheritedHalfLife(STING_HALF_LIFE_MS,standingLocus?.persistence??0);

// An impression forms per episode, not per sentence: the same act by the
// same person toward the same person within a day counts once. A run of
// messages, each reflected on, then weighs no more than one conversation.
const EPISODE_DAYS=1;
function episodes(records){
  const kept=[];
  for(const record of [...records].sort((a,b)=>a.asOf.localeCompare(b.asOf)))
    if(!kept.some(item=>item.act===record.act&&item.actorThreadId===record.actorThreadId
      &&item.personThreadId===record.personThreadId&&days(item.asOf,record.asOf)<EPISODE_DAYS))kept.push(record);
  return kept;
}

// The acts of regard between this Thread and one person, newest first: what
// it perceived in reflection, and each interruption in their conversations.
function regardActs({records,contacts,at,otherThreadId}){
  const perceived=episodes(records).map(record=>({act:record.act,by:record.actorThreadId===otherThreadId?"them":"me",
    at:record.asOf,witnesses:record.witnesses??0,perceived:true}));
  const cut=contacts.filter(contact=>contact.interrupted).flatMap(contact=>[
    ...Array.from({length:contact.interrupted.me},()=>({act:"talked_over",by:"them",at:contact.at,
      witnesses:contact.witnesses??0,perceived:false})),
    ...Array.from({length:contact.interrupted.them},()=>({act:"talked_over",by:"me",at:contact.at,
      witnesses:contact.witnesses??0,perceived:false})),
  ]);
  return [...perceived,...cut].filter(act=>act.at<=at).sort((a,b)=>b.at.localeCompare(a.at));
}

// Where their treatment places them relative to me, from the acts (newest
// first), oldest to newest.
function treatedOf(acts,orientation){
  return bodyLevel({at:Infinity,baseline:{track:{start:0}},
    events:[...acts].reverse().map(act=>({at:act.at,value:LIFT[act.act]*(act.by==="them"?1:-1),
      rate:LEARNING*(BEARS_ON[act.act]===orientation?2:1)}))}).baseline;
}
// Where I hold that they stand: my self-view, revised toward how I am treated
// as far as my stubbornness lets it (half way for the species; from 0.9 for
// the most reasonable to 0.1 for the most stubborn).
const priorOf=(locus)=>-SELF_VIEW*(locus?.selfRegard??0);
function heldOf(treated,locus){
  const revised=REVISED_SPECIES-REVISED_RANGE*(locus?.stubbornness??0);
  return (1-revised)*priorOf(locus)+revised*treated;
}

// The regard this Body expects from a person: more from one it feels below
// it, more from one it is close to, more when it feels it counts here.
export function expectedRegard({status=0,bond=0,self=0}){
  return 0.5*(-status)+0.3*bond+0.2*self;
}
// The regard an act toward this Thread shows.
export const regardShown=(act)=>-LIFT[act];

// Where this Thread feels it stands in general (ADR-0037): what it holds of
// everyone it has lived regard with, each weighed by how much, lowered by
// slights before witnesses; with no one yet, its self-view intact. Over the
// last two weeks, the gap between what it holds and how it is treated is its
// calm (none), frustration (it holds itself higher than it is treated) or
// the pleasure of being valued more than it holds.
const WITNESS_LOSS=0.05,WITNESS_LOSS_CAP=0.4;
const CHRONIC_DAYS=14;
// Frustration (body levels B2, Guy: "world events spike frustration from the
// base level and it should fade to the base level"): its baseline is the gap
// it will not reconcile, its self-view held above its treatment; each slight
// in the last days spikes it, each recognition eases it for a while, an
// approach turned down spikes it too, and all of it fades back to the
// baseline at this Body's standing persistence.
const FRUSTRATION_CALM=0.15;
const SLIGHT_SPIKE=0.5,REFUSED_SPIKE=0.3;
export function selfStanding({experienceStore,threadId,at,standingLocus=null}){
  const records=episodes(experienceStore.listRecentPerceivedRegard?.(threadId,{before:at})??[]).reverse();
  const people=new Map();
  for(const record of records){
    if(!people.has(record.personThreadId))people.set(record.personThreadId,[]);
    people.get(record.personThreadId).push(record);
  }
  const orientation=standingLocus?.orientation??null;
  let weighed=0,base=0,loss=0,gaps=0,lately=0,count=0;
  const spikes=[];
  const selfView=-priorOf(standingLocus);
  for(const [person,items] of people){
    const acts=regardActs({records:items,contacts:[],at,otherThreadId:person});
    const treated=treatedOf(acts,orientation),held=heldOf(treated,standingLocus);
    // Each act of theirs lately, against what was held of them just before it.
    acts.forEach((act,index)=>{
      if(act.by!=="them"||days(act.at,at)>STING_DAYS)return;
      const before=heldOf(treatedOf(acts.slice(index+1),orientation),standingLocus);
      const gap=regardShown(act.act)-expectedRegard({status:before,self:selfView});
      if(gap< -SLIGHT_GAP)spikes.push({at:act.at,size:Math.min(1,-gap)*SLIGHT_SPIKE});
      else if(gap>SLIGHT_GAP)spikes.push({at:act.at,size:-gap*SLIGHT_SPIKE});
    });
    const weight=Math.min(1,acts.length/5);
    weighed+=weight;base+=weight*(-held);
    acts.forEach((act,index)=>{
      if(act.by==="them"&&LIFT[act.act]>0&&act.witnesses>0)
        loss+=WITNESS_LOSS*Math.min(4,act.witnesses)*2**(-index/20);
    });
    const recent=acts.filter(act=>act.by==="them"&&days(act.at,at)<=CHRONIC_DAYS).length;
    if(recent>0){
      const w=Math.min(1,recent/5);
      gaps+=w*(held-treated);lately+=w;count+=recent;
    }
  }
  const self=Math.max(-1,Math.min(1,(weighed===0?-priorOf(standingLocus):base/weighed)
    -Math.min(WITNESS_LOSS_CAP,loss)));
  const gap=lately===0?null:gaps/lately;
  // Approaches it made that were turned down.
  for(const item of experienceStore.listSocialInteractions?.(threadId,{limit:8})??[])
    if(item.initiatorThreadId===threadId&&item.responseDecision!=="accept"
      &&item.occurredAt<=at&&days(item.occurredAt,at)<=STING_DAYS)
      spikes.push({at:item.occurredAt,size:REFUSED_SPIKE});
  const frustration=bodyLevel({at,events:spikes,halfLife:stingHalfLife(standingLocus),
    baseline:{given:gap!==null&&count>=3&&gap< -FRUSTRATION_CALM?Math.min(1,-2*gap):0},bound:{min:0,max:1}});
  return Object.freeze({self:rounded(self),gap:gap===null?null:rounded(gap),acts:count,
    frustration:Object.freeze({level:rounded(frustration.level),baseline:rounded(frustration.baseline)}),
    // The same moments, as what they did to its mood: a slight or a refusal
    // lowers it, recognition lifts it.
    felt:Object.freeze(spikes.map(({at:when,size})=>Object.freeze({at:when,value:-size}))),
    evidenceRefs:Object.freeze(records.slice(0,4).map(record=>record.regardId))});
}

// Mood (ADR-0038 B5, Guy, November 25: "A bad experience with one person may
// color the whole day"): what is felt toward someone or something also
// spills into a general tone. Each felt moment of the last week, from people
// (a slight, recognition, an approach turned down) and from what it does (a
// discovery, going deeper), moves the mood, the most from what this Body's
// mood is inherited to be moved by. It fades back in hours, at this Body's
// mood persistence, to how life has been going: a running average of those
// moments. A moment is felt as far as it differs from how life has been going
// (adaptation): a warmth in a warm life lifts little, so a society of kind
// words does not rise into constant good spirits (npm run dry-run:mood). How
// far a mood spreads, and when it is noticed, are the regulation core's.
const MOOD_HALF_LIFE_MS=6*HOUR_MS,MOOD_DAYS=7,MOOD_BASELINE_RATE=0.05;
const MOOD_SHARE=Object.freeze({people:{people:1,doing:0.4},doing:{people:0.4,doing:1},everything:{people:0.7,doing:0.7}});
export function moodOf({people=[],doing=[],at,moodLocus=null}){
  const share=MOOD_SHARE[moodLocus?.orientation]??MOOD_SHARE.everything;
  const moments=[...people.map(item=>({at:item.at,value:share.people*item.value})),
    ...doing.map(item=>({at:item.at,value:share.doing*item.value}))]
    .filter(item=>item.at<=at&&days(item.at,at)<=MOOD_DAYS).sort((a,b)=>a.at.localeCompare(b.at));
  const halfLife=inheritedHalfLife(MOOD_HALF_LIFE_MS,moodLocus?.persistence??0);
  const level=(events,when)=>bodyLevel({at:when,events,halfLife,
    baseline:{track:{rate:MOOD_BASELINE_RATE}},bound:{min:-1,max:1}});
  const events=[];
  for(const moment of moments)
    events.push({at:moment.at,value:moment.value,size:moment.value-level(events,moment.at).baseline});
  const mood=level(events,at);
  return Object.freeze({level:rounded(mood.level),baseline:rounded(mood.baseline)});
}
const rounded=(value)=>Math.round(value*1e6)/1e6;

// Affective association (ADR-0041 W3): what this Body felt in someone's
// company becomes part of how it takes them. A talk is felt as a whole, as
// people remember one: by its best moment and how it ended (peak and end),
// from its own readings of each turn. Each talk moves its sense of them part
// of the way toward how that talk felt, so it comes to expect of them what
// talks with them tend to be: warm for one who brings something new, a little
// cool for one who never does, and an old friend stays warm between visits.
// The more persistent its inherited attachment, the more slowly one talk
// moves it. Being credited or asked for advice by them warms it too, for a
// while. Hurts are trust's, not counted again here. Promise is the newness
// alone: they lately brought it something new, which keeps them interesting
// to a Body hungry for it. This is conditioning, not a judgment: who it
// seeks out, teaches or feels kindred with follows from it.
const WARMTH_RATE=0.4;
const VALUED_HALF_LIFE_MS=7*DAY_MS;
const PROMISE_HALF_LIFE_MS=3*DAY_MS;
const FELT_WITH=Object.freeze({new:1,some_new:0.5,nothing_new:-0.3});
const VALUED_BY=Object.freeze({credited:0.3,asked_advice:0.3});
function talksFelt({experienceStore,threadId,contacts,at}){
  const together=new Set(contacts.filter(contact=>contact.kind!=="message").map(contact=>contact.at));
  if(together.size===0)return [];
  const since=[...together].reduce((first,when)=>when<first?when:first,at);
  const readings=(experienceStore.listEngagementReadings?.(threadId,{since,until:at,limit:96})??[])
    .filter(item=>together.has(item.at)&&FELT_WITH[item.reading]!==undefined);
  return talksOf(readings).map(({at:when,readings:turns})=>{
    const peak=Math.max(...turns.map(item=>FELT_WITH[item.reading]));
    const end=FELT_WITH[turns.at(-1).reading];
    return {at:when,peak,tone:(peak+end)/2};
  });
}
export function warmthOf({experienceStore,threadId,contacts,regard,at,attachmentLocus=null}){
  const talks=talksFelt({experienceStore,threadId,contacts,at});
  const valued=regard.filter(act=>act.by==="them"&&VALUED_BY[act.act]).map(act=>({at:act.at,size:VALUED_BY[act.act]}));
  const rate=WARMTH_RATE*2**(-(attachmentLocus?.persistence??0));
  const warmth=bodyLevel({at,events:[...talks.map(talk=>({at:talk.at,value:talk.tone})),...valued],
    baseline:{track:{rate}},halfLife:VALUED_HALF_LIFE_MS,bound:{min:-1,max:1}}).level;
  const promise=bodyLevel({at,events:talks.filter(talk=>talk.peak>0).map(talk=>({at:talk.at,size:talk.peak})),
    halfLife:PROMISE_HALF_LIFE_MS,bound:{saturate:1}}).level;
  return Object.freeze({warmth:rounded(warmth),promise:rounded(promise)});
}

// How this Thread's Body regards another person, from the lived contact and
// the relational acts World recorded between them: how well it knows them,
// how out of date it is with them, how far it trusts them, how much what they
// did still hurts, and whether a new hurt has just brought back an old one.
// The trust locus ({orientation, persistence}, already scaled by inherited
// spread) says what counts as safety and how fast this Body forgives.
export function regardOf({experienceStore,threadId,otherThreadId,at,trustLocus=null,standingLocus=null,attachmentLocus=null}){
  if(otherThreadId===null||otherThreadId===threadId)return NO_ONE;
  const contacts=experienceStore.listSharedContact(threadId,otherThreadId,{before:at});
  const regard=regardActs({contacts,at,otherThreadId,
    records:experienceStore.listPerceivedRegard?.(threadId,otherThreadId,{before:at})??[]});
  const slights=regard.filter(act=>act.by==="them"&&LIFT[act.act]>0&&act.perceived)
    .map(act=>({kind:act.witnesses>0||PUBLIC_ACTS.includes(act.act)?"slighted_publicly":"slighted",occurredAt:act.at}));
  const acts=[...experienceStore.listPairActs(threadId,otherThreadId,{before:at})
    .filter(act=>act.actorThreadId===otherThreadId),...slights];
  const {knowing,current}=familiarityOf(contacts,at);
  const latest=(items)=>items.reduce((when,contact)=>when===null||contact.at>when?contact.at:when,null);
  const last=latest(contacts),lastInPerson=latest(contacts.filter(contact=>contact.kind!=="message"));
  const lived=livedTrust({contacts,acts,at,weights:TRUST_WEIGHTS[trustLocus?.orientation]??SPECIES_WEIGHTS,
    pace:2**(2*(trustLocus?.persistence??0))});
  return Object.freeze({knowing:rounded(knowing),staleness:rounded(knowing*(1-current)),
    trust:rounded(lived.trust),hurt:rounded(lived.hurt),revived:lived.revived,
    ...warmthOf({experienceStore,threadId,contacts,regard,at,attachmentLocus}),
    status:rounded(heldOf(treatedOf(regard,standingLocus?.orientation??null),standingLocus)),
    treated:rounded(treatedOf(regard,standingLocus?.orientation??null)),
    // What it held before the last day's acts: what those acts were judged
    // against (a slight is measured by the expectation it upset).
    expectedFrom:rounded(heldOf(treatedOf(regard.filter(act=>days(act.at,at)>SLIGHT_FRESH_DAYS),
      standingLocus?.orientation??null),standingLocus)),
    refusedAt:acts.filter(act=>act.kind==="declined"&&days(act.occurredAt,at)<=STING_DAYS)
      .reduce((when,act)=>when===null||act.occurredAt>when?act.occurredAt:when,null),
    lately:Object.freeze(regard.filter(act=>act.by==="them"&&days(act.at,at)<=STING_DAYS).slice(0,3)),
    apartDays:last===null?null:rounded(days(last,at)),
    apartInPersonDays:lastInPerson===null?null:rounded(days(lastInPerson,at)),
    messagedAt:Object.freeze(contacts.filter(contact=>contact.kind==="message"
      &&(lastInPerson===null||contact.at>lastInPerson)).map(contact=>contact.at))});
}

// The bond (ADR-0036 R2): how much a person has come to matter to this Body,
// from how well it knows them, how far it trusts them, the doors they have
// opened to each other, and how it has felt to be with them (ADR-0041 W3).
// Being able to talk counts a little; reaching each other, meeting by
// arrangement and sharing places count more. A stranger has none, so a
// stranger is never missed.
const DOOR_BOND=Object.freeze({conversation:0.2,contact:0.3,time:0.3,place:0.2,
  confidence:0.4,care:0.4,romance:0.4,commitment:0.4});
// How it felt to be with them (affective association) deepens or thins it.
const BOND_WARMTH=0.5;
export function bondOf({regard,doors}){
  const opened=Math.min(1,doors.reduce((sum,door)=>sum+(DOOR_BOND[door]??0),0));
  return rounded(Math.min(1,regard.knowing*regard.trust*opened*(1+BOND_WARMTH*(regard.warmth??0))));
}

// Missing a bonded person (body levels B3, Guy, November 13): a baseline
// that rises over the first days apart and levels off at the bond, so a
// light bond is missed faintly and a deep one aches for as long as they are
// apart. Apart means not in each other's presence, except for a Body whose
// attachment is to the exchange itself, which a message answers.
// On it, since they parted: a memory of time with them coming back to mind
// brings them back; something new or absorbing elsewhere takes the mind off them;
// for a Body that longs for their presence, a message relieves part of it.
// Each fades back to the baseline, more slowly the more persistent this
// Body's attachment locus (persistence already scaled by inherited spread).
const MISSING_HALF_LIFE_MS=6*HOUR_MS;
const REMINDED=0.4,ABSORBED=-0.2,MESSAGED=-0.5;
const NO_LONGING=Object.freeze({level:0,baseline:0,reminded:false});
export function longingOf({bond,regard,orientation=null,persistence=0,at=null,reminders=[],absorbed=[]}){
  const reciprocal=orientation==="reciprocal_contact";
  const apart=reciprocal?regard.apartDays:regard.apartInPersonDays;
  if(bond===0||apart===null)return NO_LONGING;
  const baseline=bond*(1-2**(-apart/3))**2;
  if(at===null)return Object.freeze({level:rounded(baseline),baseline:rounded(baseline),reminded:false});
  const parted=Date.parse(at)-apart*DAY_MS;
  const since=(times,size)=>times.filter(when=>Date.parse(when)>parted).map(when=>({at:when,size:size*bond}));
  const reminded=since(reminders,REMINDED);
  const {level}=bodyLevel({at,baseline:{given:baseline},bound:{min:0,max:1},
    halfLife:inheritedHalfLife(MISSING_HALF_LIFE_MS,persistence),
    events:[...reminded,...since(absorbed,ABSORBED),...(reciprocal?[]:since(regard.messagedAt??[],MESSAGED))]});
  return Object.freeze({level:rounded(level),baseline:rounded(baseline),
    reminded:reminded.some(event=>fade(event.size,Date.parse(at)-Date.parse(event.at),
      inheritedHalfLife(MISSING_HALF_LIFE_MS,persistence))>0.1*bond)});
}

// The joy of being with a bonded person again (B3): every bond brings it, in
// proportion to the bond, and up to twice that after a long absence missed.
// Gladness at seeing them again needs some time apart first: hardly any an
// hour after parting, half within a day.
export function reunionJoy({bond,regard,longing}){
  const apart=regard.apartInPersonDays??regard.apartDays;
  if(bond===0||apart===null)return 0;
  return rounded(Math.min(1,bond*(1-2**(-apart))*(0.5+0.5*longing/bond)));
}

// Moments apart that bear on missing someone, from the last two days: when
// a memory of time with a person came back to mind (its own cognition drew
// on it, or a cue brought it back), and when something absorbed it. Several
// within an hour are one moment. Read once for everyone it is bonded to.
const MISSING_WINDOW_MS=2*DAY_MS;
const moments=(times)=>[...times].sort().reverse()
  .filter((when,index,all)=>index===0||Date.parse(all[index-1])-Date.parse(when)>=HOUR_MS);
export function missingMoments({experienceStore,memoryStore=null,threadId,at}){
  const since=new Date(Date.parse(at)-MISSING_WINDOW_MS).toISOString();
  const absorbed=moments((experienceStore?.listEngagementReadings?.(threadId,{since,until:at,limit:96})??[])
    .filter(item=>tookItsMind(item.reading)).map(item=>item.at));
  const recalled=memoryStore?.listRecalledMemories?.(threadId,{since,until:at})??[];
  return Object.freeze({absorbed,remindersOf:(personThreadId)=>{
    if(recalled.length===0)return [];
    const shared=new Set(experienceStore.listSharedExperienceRefs?.(threadId,personThreadId,{before:at,limit:64})??[]);
    return moments(recalled.filter(memory=>memory.eventRefs.some(ref=>shared.has(ref))).map(memory=>memory.at));
  }});
}

// What one turn of talk (or one message) with a person costs this Body.
export function exposureCost({knowing=0,staleness=0,trust=0,kind="conversation"}){
  return TURN_COST*((1-knowing)+STALE_COST*staleness+EXPECTED_HARM*(1-trust))*(kind==="message"?MESSAGE_WEIGHT:1);
}

// Depletion after a run of exposures, recovering between them and after the
// last one (exposures: {at, turns, cost} in any order).
// (A reservoir on the body-level component: it fills with each exposure,
// never past empty, and recovers between them.)
export function socialDepletion(exposures,{asOf}){
  return bodyLevel({at:asOf,cap:1,halfLife:RECOVERY_HALF_LIFE_MS,
    events:[...exposures].sort((a,b)=>a.at.localeCompare(b.at)).map(item=>({at:item.at,size:item.turns*item.cost}))}).level;
}

// The battery as World knows it at asOf, from the last half-day of lived talk
// and messages; null when there was none.
export function socialEnergyEvidence({threadId,experienceStore,asOf,trustLocus=null}){
  const since=new Date(Date.parse(asOf)-WINDOW_MS).toISOString();
  const exposures=experienceStore.listSocialExposures(threadId,{since,until:asOf});
  if(exposures.length===0)return null;
  const known=new Map();
  const regard=(otherThreadId)=>{
    if(!known.has(otherThreadId))known.set(otherThreadId,
      regardOf({experienceStore,threadId,otherThreadId,at:asOf,trustLocus}));
    return known.get(otherThreadId);
  };
  const depletion=socialDepletion(exposures.map(item=>({at:item.at,turns:item.turns,
    cost:exposureCost({...regard(item.otherThreadId),kind:item.kind})})),{asOf});
  return Object.freeze({depletion:rounded(depletion),
    evidenceRefs:Object.freeze(exposures.slice(0,4).map(item=>item.ref))});
}

// The battery during a conversation: where it stood when the talk began, and
// each turn spoken or heard since.
// Going over ground this Body is weary of costs a little more (S5b).
// Weariness and frustration each make every turn cost a little more: less
// patience for the same, and for anyone.
export function conversationDepletion({start,turns,knowing=0,staleness=0,trust=0,weariness=0,frustration=0}){
  return Math.min(1,(start?.depletion??0)+turns*(exposureCost({knowing,staleness,trust})
    +0.5*(weariness+frustration)*TURN_COST));
}
