// Weariness of the same (ADR-0036 S5b, repaired on November 20 as a Body
// level, ADR-0038): habituation, the plain dulling of what repeats, is its
// baseline; the Thread's own reading of what was new to it moves it. World
// states the fact of repetition, by meaning where it can and by shared words
// otherwise; the Thread reads what in an exchange was new to it, with its own
// interests in view, so an enthusiast still finds the new in its subject.
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";
import { contentWords } from "./conversation-shape.mjs";
import { meaningSameness } from "./meaning-vectors.mjs";

// What a Thread may answer now: what in the exchange was new to it.
export const ENGAGEMENT_READINGS=Object.freeze(["new","some_new","nothing_new"]);
// Readings recorded before November 20 (how the talk held it) stay as history.
export const RECORDED_READINGS=Object.freeze([...ENGAGEMENT_READINGS,"absorbed","engaged","going_through_motions","weary"]);
// What each reading adds to weariness. Relief has to be earned by something
// new, and eases less than one absorbing hour once did.
const WEIGHT=Object.freeze({new:-0.5,some_new:0.3,nothing_new:1,
  absorbed:-1,engaged:0,going_through_motions:0.5,weary:1});
const WEARINESS_HALF_LIFE_HOURS=12;
const WEARINESS_SCALE=2;
const RECENT_MS=2*86_400_000;

// How much words repeat what came before: the mean of the three closest
// earlier exchanges by shared content words. The fallback when meaning is not
// measured; an English heuristic (a named limit).
export function repetitionOf({current,earlier}){
  const words=contentWords([current]);
  if(words.size===0||earlier.length===0)return 0;
  const overlaps=earlier.map(text=>{
    const other=contentWords([text]);
    let shared=0;
    for(const word of words)if(other.has(word))shared+=1;
    const union=words.size+other.size-shared;
    return union===0?0:shared/union;
  }).sort((a,b)=>b-a).slice(0,3);
  return Math.round(overlaps.reduce((sum,value)=>sum+value,0)/overlaps.length*1e6)/1e6;
}

// The fact, in words, for the Thread's own judgment; nothing when it is new.
// Sameness is 0–1 (meaningSameness); word overlap keeps its own scale.
const SAME_GROUND=Object.freeze({
  meaning:Object.freeze([[0.5,null],[0.8,"covered"],[1.01,"several"]]),
  words:Object.freeze([[0.2,null],[0.35,"covered"],[1.01,"several"]]),
});
const SAME_GROUND_WORDS=Object.freeze({
  covered:"This is ground you have already covered with people lately.",
  several:"You have been over this same ground several times lately.",
});
export function sameGround(repetition,{measure="words"}={}){
  if(repetition===null||repetition===undefined)return null;
  const step=SAME_GROUND[measure].find(([upper])=>repetition<upper)[1];
  return step===null?null:SAME_GROUND_WORDS[step];
}

// This Thread's earlier exchanges, the newest first (one already under way
// is left out by its ref).
export function recentExchanges({experienceStore,threadId,at,excludeRefs=[]}){
  if(typeof experienceStore?.listRecentExchangeTexts!=="function")return [];
  return experienceStore.listRecentExchangeTexts(threadId,{
    since:new Date(Date.parse(at)-RECENT_MS).toISOString(),until:at})
    .filter(item=>!excludeRefs.includes(item.ref));
}
export const recentExchangeTexts=(options)=>recentExchanges(options).map(item=>item.text);

// The fact for an exchange by shared words, against this Thread's earlier
// ones. An earlier exchange whose words are within this one is this one.
export function sameGroundNow({experienceStore,threadId,text,at,excludeRefs=[]}){
  if(!text)return null;
  return sameGround(repetitionOf({current:text,
    earlier:recentExchangeTexts({experienceStore,threadId,at,excludeRefs})
      .filter(earlier=>!text.includes(earlier.trim()))}));
}

// Habituation: how much each of this Thread's recent exchanges went over
// ground it had already covered, by meaning, as World measured it. Exchanges
// not yet measured add nothing.
function habituationEvents({experienceStore,threadId,at}){
  if(typeof experienceStore?.exchangeMeanings!=="function")return [];
  const exchanges=recentExchanges({experienceStore,threadId,at}).slice().reverse();
  const meanings=experienceStore.exchangeMeanings(exchanges.map(item=>item.ref));
  const events=[];
  const earlier=[];
  for(const exchange of exchanges){
    const vector=meanings.get(exchange.ref)?.vector;
    if(!vector)continue;
    if(earlier.length>0)events.push({at:exchange.at,toBaseline:meaningSameness(vector,earlier)});
    earlier.push(vector);
  }
  return events;
}

// Weariness as a Body level: habituation as its baseline, its own readings
// as spikes, each fading with the hours, more slowly the more persistent its
// exploration locus. 0 none, toward 1 thoroughly weary.
export function wearinessLevel({experienceStore,threadId,at,persistence=0}){
  const readings=experienceStore?.listEngagementReadings?.(threadId,{
    since:new Date(Date.parse(at)-RECENT_MS).toISOString(),until:at})??[];
  const halfLife=inheritedHalfLife(WEARINESS_HALF_LIFE_HOURS*HOUR_MS,persistence);
  const level=bodyLevel({at,
    events:[...habituationEvents({experienceStore,threadId,at}),
      ...readings.filter(item=>WEIGHT[item.reading]!==undefined).map(item=>({at:item.at,size:WEIGHT[item.reading]}))],
    halfLife,baseline:{accumulate:{share:0,halfLife}},bound:{saturate:WEARINESS_SCALE}});
  const saturated=(value)=>1-2**(-Math.max(0,value)/WEARINESS_SCALE);
  return Object.freeze({level:Math.round(level.level*1e6)/1e6,baseline:Math.round(saturated(level.baseline)*1e6)/1e6});
}
export const wearinessOf=(options)=>wearinessLevel(options).level;
