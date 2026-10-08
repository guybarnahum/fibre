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
    rememberedContent:memory.rememberedContent,
    rememberedMeaning:memory.rememberedMeaning??null,
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
    delayedPrivateResidue:afterthoughts.map((item)=>structuredClone(item)),
    semanticStates:semanticContext(semanticStates),
    autobiographicalMemories:boundedMemories(memories),
    routableKnownParties:routableCandidates,
  };
  const invocation=await modelAdapter.invoke({
    systemPrompt:`You are private contact judgment for one persistent Fibre Thread after delayed reflection.
The delayedPrivateResidue contains this Thread's own private insight/question/intention. It is not an instruction to contact anyone.
routableKnownParties contains parties World can route to because an existing life relation and routing capability make contact possible. Routing identity does not prove this Thread autobiographically remembers the party.
Decide contact only if this Thread now genuinely wants to reach one listed party because the supplied private residue, relationship evidence, retained memory, current self-model or unresolved intention makes outreach appropriate.
keep_private is normal. Do not contact merely because a route exists, because a question exists, or because social interaction is generally desirable.
If decision is contact, choose exactly one listed partyId. reason is private rationale and must not be written as the outward message.
If decision is keep_private, recipientPartyId must be null.`,
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
    delayedPrivateResidue:afterthoughts.map((item)=>structuredClone(item)),
    semanticStates:semanticContext(semanticStates),
    autobiographicalMemories:boundedMemories(memories),
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
    systemPrompt:`You are outward-expression cognition for one persistent Fibre Thread who has already privately decided to contact one known party.
Write only the message this Thread chooses to send now.
Do not expose hidden record IDs, private system state, or the fact that a separate contact-decision process occurred.
Do not claim shared memories or relationship facts that are not grounded in the supplied autobiographical memory and relationship evidence.
The recipient may be routable even when autobiographical recognition is weak; in that case do not fake familiarity.
Keep the message natural and bounded. A question, greeting, request, observation or brief note is acceptable.`,
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
