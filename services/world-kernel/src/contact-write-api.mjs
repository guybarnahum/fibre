import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
} from "./persistence-common.mjs";

const TOKEN_ENCODER=new TextEncoder();
const CAPABILITY_ROUTE="/internal/contact/person-capability";
const REVOKE_ROUTE="/internal/contact/person-capability/revoke";
const INBOX_ROUTE="/internal/contact/inbox";

function constantTimeEqual(left,right){
  if(typeof left!=="string"||typeof right!=="string")return false;
  const leftBytes=TOKEN_ENCODER.encode(left);
  const rightBytes=TOKEN_ENCODER.encode(right);
  const length=Math.max(leftBytes.length,rightBytes.length);
  let difference=leftBytes.length^rightBytes.length;
  for(let index=0;index<length;index+=1){
    difference|=(leftBytes[index]??0)^(rightBytes[index]??0);
  }
  return difference===0;
}

function json(value,status=200){
  return Response.json(value,{status,headers:{"cache-control":"no-store"}});
}

function requireMethod(owner,name,method){
  if(!owner||typeof owner[method]!=="function"){
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

export function createContactWriteApi({
  contactStore,
  privateToken,
  onRouteChanged=null,
  now=()=>new Date().toISOString(),
}={}){
  requireMethod(contactStore,"contactStore","registerPersonCapability");
  requireMethod(contactStore,"contactStore","revokePersonCapability");
  requireMethod(contactStore,"contactStore","getPersonCapability");
  requireMethod(contactStore,"contactStore","listInbox");
  if(typeof privateToken!=="string"||privateToken.trim()===""){
    throw new TypeError("contact API requires privateToken");
  }
  if(onRouteChanged!==null&&typeof onRouteChanged!=="function"){
    throw new TypeError("contact API onRouteChanged must be null or a function");
  }
  if(typeof now!=="function")throw new TypeError("contact API requires now()");

  return Object.freeze({
    async fetch(request){
      const url=new URL(request.url);
      if(![CAPABILITY_ROUTE,REVOKE_ROUTE,INBOX_ROUTE].includes(url.pathname))return null;
      if(!constantTimeEqual(request.headers.get("x-fibre-private-token"),privateToken)){
        return json({error:"private_token_required"},403);
      }

      if(url.pathname===INBOX_ROUTE){
        if(request.method!=="GET")return json({error:"method_not_allowed"},405);
        try{
          const partyId=url.searchParams.get("partyId");
          assertId("contact inbox partyId",partyId);
          return json({
            ok:true,
            partyId,
            messages:contactStore.listInbox(partyId,{limit:200}),
          });
        }catch(error){
          return json({error:"invalid_contact_inbox",detail:error.message},400);
        }
      }

      if(url.pathname===CAPABILITY_ROUTE&&request.method==="GET"){
        try{
          const partyId=url.searchParams.get("partyId");
          assertId("person contact partyId",partyId);
          return json({
            ok:true,
            capability:contactStore.getPersonCapability(partyId,{required:false}),
          });
        }catch(error){
          return json({error:"invalid_person_contact_capability",detail:error.message},400);
        }
      }

      if(request.method!=="POST")return json({error:"method_not_allowed"},405);

      try{
        const body=await request.json();
        assertPlainObject("contact API request",body);
        if(url.pathname===CAPABILITY_ROUTE){
          assertExactKeys("person contact capability request",body,["partyId","displayName"]);
          assertId("person contact capability partyId",body.partyId);
          assertNonEmpty("person contact capability displayName",body.displayName);
          const capability=contactStore.registerPersonCapability({
            partyId:body.partyId,
            displayName:body.displayName,
            registeredAt:now(),
          });
          await onRouteChanged?.({kind:"registered",partyId:body.partyId});
          return json({ok:true,capability});
        }

        assertExactKeys("person contact capability revocation request",body,["partyId","reason"]);
        assertId("person contact capability revocation partyId",body.partyId);
        assertNonEmpty("person contact capability revocation reason",body.reason);
        const revocation=contactStore.revokePersonCapability({
          partyId:body.partyId,
          reason:body.reason,
          revokedAt:now(),
        });
        await onRouteChanged?.({kind:"revoked",partyId:body.partyId});
        return json({ok:true,revocation});
      }catch(error){
        return json({error:"invalid_person_contact_request",detail:error.message},400);
      }
    },
  });
}
