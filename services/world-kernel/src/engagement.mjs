// Boredom (ADR-0036 S5b, as Guy refined it on November 11): subjective, and
// bent by interest. World states a fact, how much an exchange repeats this
// Thread's recent ones; the Thread reads how the exchange holds it, with its
// own interests in view; its Body accumulates those readings at the pace of
// its inherited exploration locus. An enthusiast's readings stay absorbed and
// it never wearies of its subject; the fact of repetition is there for all.
import { bodyLevel, HOUR_MS, inheritedHalfLife } from "#core/src/body-level.mjs";
import { contentWords } from "./conversation-shape.mjs";

export const ENGAGEMENT_READINGS=Object.freeze(["absorbed","engaged","going_through_motions","weary"]);
// What each reading adds to weariness; being absorbed relieves it.
const WEIGHT=Object.freeze({absorbed:-1,engaged:0,going_through_motions:0.5,weary:1});
const WEARINESS_HALF_LIFE_HOURS=12;
const WEARINESS_SCALE=2;
const RECENT_MS=2*86_400_000;

// How much words repeat what came before: the mean of the three closest
// earlier exchanges by shared content words. An English heuristic; meaning
// in other words is the language-neutral measure's to catch (a named limit).
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
const SAME_GROUND=Object.freeze([
  [0.2,null],
  [0.35,"This is ground you have already covered with people lately."],
  [1.01,"You have been over this same ground several times lately."],
]);
export function sameGround(repetition){
  return SAME_GROUND.find(([upper])=>repetition<upper)[1];
}

// This Thread's earlier exchanges' words, the newest first (one already
// under way is left out by its ref).
export function recentExchangeTexts({experienceStore,threadId,at,excludeRefs=[]}){
  if(typeof experienceStore?.listRecentExchangeTexts!=="function")return [];
  return experienceStore.listRecentExchangeTexts(threadId,{
    since:new Date(Date.parse(at)-RECENT_MS).toISOString(),until:at})
    .filter(item=>!excludeRefs.includes(item.ref)).map(item=>item.text);
}

// The fact for an exchange, against this Thread's earlier ones.
// An earlier exchange whose words are within this one is this one.
export function sameGroundNow({experienceStore,threadId,text,at,excludeRefs=[]}){
  if(!text)return null;
  return sameGround(repetitionOf({current:text,
    earlier:recentExchangeTexts({experienceStore,threadId,at,excludeRefs})
      .filter(earlier=>!text.includes(earlier.trim()))}));
}

// Weariness from this Thread's own recent readings: each fades with the
// hours, more slowly the more persistent its exploration locus (persistence
// already scaled by inherited spread). 0 none, toward 1 thoroughly weary.
export function wearinessOf({experienceStore,threadId,at,persistence=0}){
  const readings=experienceStore?.listEngagementReadings?.(threadId,{
    since:new Date(Date.parse(at)-RECENT_MS).toISOString(),until:at})??[];
  return Math.round(bodyLevel({at,events:readings.map(item=>({at:item.at,size:WEIGHT[item.reading]})),
    halfLife:inheritedHalfLife(WEARINESS_HALF_LIFE_HOURS*HOUR_MS,persistence),
    bound:{saturate:WEARINESS_SCALE}}).level*1e6)/1e6;
}
