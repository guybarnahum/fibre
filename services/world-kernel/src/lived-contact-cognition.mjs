import { memoryInMind } from "./memory-in-mind.mjs";
import { promptRequest } from "./cognition-prompts.mjs";
import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

function requestId(prefix,input){
  return `${prefix}_${sha256(canonicalJson(input))}`;
}

function boundedMemories(memories){
  return (Array.isArray(memories)?memories:[]).slice(0,8).map((memory)=>({
    memoryId:memory.memoryId,
    ...memoryInMind(memory),
  }));
}

function semanticContext(states){
  return (Array.isArray(states)?states:[]).map((state)=>({
    domain:state.domain,
    dimension:state.dimension,
    target:state.target??null,
    state:state.state,
  }));
}

function candidateContext(candidates){
  if(!Array.isArray(candidates)||candidates.length<1){
    throw new TypeError("contact cognition requires at least one routable candidate");
  }
  return candidates.map((candidate)=>{
    assertPlainObject("contact candidate",candidate);
    assertId("contact candidate.partyId",candidate.partyId);
    if(!["thread","person"].includes(candidate.recipientKind)){
      throw new TypeError("contact candidate recipientKind is invalid");
    }
    assertNonEmpty("contact candidate.displayName",candidate.displayName);
    return {
      partyId:candidate.partyId,
      recipientKind:candidate.recipientKind,
      displayName:candidate.displayName,
      relationKind:candidate.relationKind,
      factualRoleRefs:[...(candidate.factualRoleRefs??[])],
      relationshipFacts:[...(candidate.relationshipFacts??[])],
    };
  });
}

export async function decideLaterContact({
  thread,
  afterthoughts,
  currentSituation=null,
  semanticStates=[],
  memories=[],
  candidates,
  modelAdapter,
}={}){
  assertPlainObject("contact Thread",thread);
  assertId("contact Thread.threadId",thread.threadId);
  if(!Array.isArray(afterthoughts)||afterthoughts.length<1){
    throw new TypeError("contact cognition requires delayed private residue");
  }
  const routableCandidates=candidateContext(candidates);
  const input={
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
      unresolvedIntentions:[...(thread.currentState?.unresolvedIntentions??[])],
    },
    // Stable self first and this moment's residue last, for a shared prompt prefix.
    semanticStates:semanticContext(semanticStates),
    autobiographicalMemories:boundedMemories(memories),
    routableKnownParties:routableCandidates,
    currentSituation:currentSituation===null?null:structuredClone(currentSituation),
    delayedPrivateResidue:afterthoughts.map((item)=>structuredClone(item)),
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("contact.decision",{threadId:thread.threadId}),
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["decision","recipientPartyId","reason"],
      properties:{
        decision:{type:"string",enum:["contact","keep_private"]},
        recipientPartyId:{anyOf:[{type:"string",minLength:1},{type:"null"}]},
        reason:{type:"string",minLength:1,maxLength:800},
      },
    },
    clientRequestId:requestId("later-contact-decision",input),
  });
  assertPlainObject("later contact decision",invocation.output);
  assertExactKeys("later contact decision",invocation.output,[
    "decision","recipientPartyId","reason",
  ]);
  assertNonEmpty("later contact reason",invocation.output.reason);
  if(!["contact","keep_private"].includes(invocation.output.decision)){
    throw new TypeError("later contact decision is invalid");
  }
  if(invocation.output.decision==="keep_private"){
    if(invocation.output.recipientPartyId!==null){
      throw new TypeError("keep_private cannot select a recipient");
    }
  }else{
    assertId("later contact recipientPartyId",invocation.output.recipientPartyId);
    if(!routableCandidates.some((candidate)=>candidate.partyId===invocation.output.recipientPartyId)){
      throw new TypeError("later contact selected an unroutable party");
    }
  }
  return Object.freeze({
    decision:invocation.output.decision,
    recipientPartyId:invocation.output.recipientPartyId,
    reason:invocation.output.reason.trim(),
    provenance:Object.freeze(structuredClone(invocation.provenance??{})),
  });
}

export async function expressLaterContact({
  thread,
  afterthoughts,
  currentSituation=null,
  semanticStates=[],
  memories=[],
  candidate,
  privateDecision,
  modelAdapter,
}={}){
  assertPlainObject("contact Thread",thread);
  assertId("contact Thread.threadId",thread.threadId);
  assertPlainObject("contact candidate",candidate);
  assertId("contact candidate.partyId",candidate.partyId);
  assertPlainObject("contact privateDecision",privateDecision);
  if(privateDecision.decision!=="contact"||privateDecision.recipientPartyId!==candidate.partyId){
    throw new TypeError("contact expression requires matching private contact decision");
  }
  const input={
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name??null,
      selfDescription:thread.identity?.selfDescription??"",
      selfModel:thread.currentState?.selfModel??"",
    },
    semanticStates:semanticContext(semanticStates),
    autobiographicalMemories:boundedMemories(memories),
    currentSituation:currentSituation===null?null:structuredClone(currentSituation),
    delayedPrivateResidue:afterthoughts.map((item)=>structuredClone(item)),
    recipient:{
      partyId:candidate.partyId,
      recipientKind:candidate.recipientKind,
      displayName:candidate.displayName,
      relationKind:candidate.relationKind,
      relationshipFacts:[...(candidate.relationshipFacts??[])],
    },
    privateContactIntent:{
      reason:privateDecision.reason,
    },
  };
  const invocation=await modelAdapter.invoke({
    ...promptRequest("contact.message",{threadId:thread.threadId}),
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["messageText"],
      properties:{
        messageText:{type:"string",minLength:1,maxLength:1200},
      },
    },
    clientRequestId:requestId("later-contact-expression",input),
  });
  assertPlainObject("later contact expression",invocation.output);
  assertExactKeys("later contact expression",invocation.output,["messageText"]);
  assertNonEmpty("later contact messageText",invocation.output.messageText);
  return Object.freeze({
    messageText:invocation.output.messageText.trim(),
    provenance:Object.freeze(structuredClone(invocation.provenance??{})),
  });
}
