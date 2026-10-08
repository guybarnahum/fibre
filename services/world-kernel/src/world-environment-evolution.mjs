import { createEncounterVisualization } from "./lived-encounter-visualization.mjs";
import {
  assertExactKeys,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export function createWorldEnvironmentEvolution({
  experienceStore,
  modelAdapter,
  now=()=>new Date().toISOString(),
  batchLimit=2,
}={}){
  for(const method of [
    "listDueEnvironmentalFollowups","nextEnvironmentalFollowupAt",
    "getEncounterStory","recordEnvironmentalFollowupDecision",
    "recordEncounterStory","completeEnvironmentalFollowup",
  ]){
    if(typeof experienceStore?.[method]!=="function"){
      throw new TypeError(`World environmental evolution requires ${method}()`);
    }
  }
  if(typeof modelAdapter?.invoke!=="function")throw new TypeError("World environmental evolution requires cognition");
  if(!Number.isSafeInteger(batchLimit)||batchLimit<1||batchLimit>4){
    throw new TypeError("World environmental evolution batchLimit must be 1-4");
  }

  return Object.freeze({
    async runOnce(){
      const at=now();
      const due=experienceStore.listDueEnvironmentalFollowups({at,limit:batchLimit});
      let failed=0;
      const results=[];
      for(const opportunity of due){
        try{
          const source=experienceStore.getEncounterStory(opportunity.sourceEncounterRef);
          let decision=opportunity.decision;
          if(decision===null){
            const input={
              placeRef:opportunity.placeRef,
              previousOccurrence:{
                occurredAt:source.occurredAt,
                text:source.story.beats[0].text,
              },
              considerationAt:opportunity.dueAt,
            };
            const invocation=await modelAdapter.invoke({
              systemPrompt:`You author the next possible observable change in a physical place in Fibre's World.
Only the objective previous occurrence, place reference and elapsed time are known. Do not invent a Thread's thoughts, perspective, attention, or actions.
Choose no_change if there is no warranted meaningful new objective event; ordinary quiet continuity is valid.
If there is a natural change, write only one concise observable event. Make it physically consistent with the earlier occurrence, without pretending to know precise unprovided weather, geography, or people.
This is one bounded follow-up, not a repeating weather simulation.`,
              input,
              responseSchema:{
                type:"object",
                additionalProperties:false,
                required:["outcome","occurrenceText"],
                properties:{
                  outcome:{type:"string",enum:["no_change","changed"]},
                  occurrenceText:{anyOf:[{type:"string",minLength:1,maxLength:800},{type:"null"}]},
                },
              },
              clientRequestId:`world-environment-followup_${sha256(canonicalJson(input))}`,
            });
            assertPlainObject("World follow-up cognition",invocation.output);
            assertExactKeys("World follow-up cognition",invocation.output,["outcome","occurrenceText"]);
            if(invocation.output.outcome==="changed")assertNonEmpty(
              "World follow-up change",invocation.output.occurrenceText,
            );
            else if(invocation.output.outcome!=="no_change"||invocation.output.occurrenceText!==null){
              throw new TypeError("World follow-up must return a change or no_change");
            }
            decision=experienceStore.recordEnvironmentalFollowupDecision({
              sourceEncounterRef:opportunity.sourceEncounterRef,
              decision:invocation.output,
            });
          }

          let encounterId=null;
          if(decision.outcome==="changed"){
            const story={
              storyVersion:"encounter-story-v0.1",
              continuationOfEncounterRef:source.encounterId,
              beats:[{
                actorThreadId:null,kind:"occurrence",text:decision.occurrenceText,
              }],
            };
            const recorded=experienceStore.recordEncounterStory({
              occurredAt:opportunity.dueAt,
              threadPresence:[],
              story,
              visualization:createEncounterVisualization({
                occurredAt:opportunity.dueAt,
                scene:`At shared World place ${opportunity.placeRef}.`,
                story,
                sourceReferences:[opportunity.placeRef,source.encounterId],
                depictedThreadRefs:[],
              }),
            },{uniquePlaceOccurrenceRef:opportunity.placeRef});
            encounterId=recorded.encounterId;
          }
          experienceStore.completeEnvironmentalFollowup({
            sourceEncounterRef:opportunity.sourceEncounterRef,
            resultEncounterRef:encounterId,
            completedAt:at,
          });
          results.push(Object.freeze({
            sourceEncounterRef:opportunity.sourceEncounterRef,
            outcome:decision.outcome,
            encounterId,
          }));
        }catch(error){
          failed+=1;
          results.push(Object.freeze({
            sourceEncounterRef:opportunity.sourceEncounterRef,
            outcome:"failed",
            message:String(error?.message??error).slice(0,220),
          }));
        }
      }
      const nextDueAt=experienceStore.nextEnvironmentalFollowupAt();
      return Object.freeze({
        attempted:due.length,
        completed:due.length-failed,
        failed,
        nextDueAt,
        hasDue:nextDueAt!==null&&Date.parse(nextDueAt)<=Date.parse(at),
        results:Object.freeze(results),
      });
    },
  });
}
