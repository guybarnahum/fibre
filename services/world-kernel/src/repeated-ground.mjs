// What a Thread keeps coming back to (Body-drives plan C1, approved by Guy,
// November 25): its fullness can only point at something if that something
// has a name. World finds where the Thread's recent exchanges cluster by
// meaning; the Thread names that ground itself, in a few plain words, from
// its own words there, never from an interest's label (an interest called
// "books, libraries and discovery" was the method's form for one Thread).
// The name reaches the Body's words, so "you have had enough of this" says
// of what.
import { promptRequest } from "./cognition-prompts.mjs";
import { recentExchanges } from "./engagement.mjs";
import { closeness, encodeMeaning, unit } from "./meaning-vectors.mjs";
import { assertExactKeys, assertPlainObject, canonicalJson, sha256 } from "./persistence-common.mjs";

// Two exchanges go over the same ground at the closeness where World already
// says "ground you have covered" (meaningSameness 0.5, bge-m3 on staging).
const SAME_GROUND=0.65;
// A ground is a centre and at least two exchanges near it.
const AT_LEAST=2;
// Named again when where it clusters has moved, or after three days.
const SAME_NAME=0.85;
const RENAME_MS=3*86_400_000;
const WORDS=5,WORDS_CHARS=600;

// Where this Thread's recent exchanges cluster by meaning: the exchange with
// the most others near it, and those others. Null when nothing repeats.
export function repeatedGround({experienceStore,threadId,at}){
  if(typeof experienceStore?.exchangeMeanings!=="function")return null;
  const exchanges=recentExchanges({experienceStore,threadId,at});
  const meanings=experienceStore.exchangeMeanings(exchanges.map(item=>item.ref));
  const measured=exchanges.filter(item=>meanings.has(item.ref))
    .map(item=>({...item,vector:meanings.get(item.ref).vector}));
  let centre=null;
  for(const item of measured){
    const near=measured.filter(other=>other!==item&&closeness(item.vector,other.vector)>=SAME_GROUND);
    if(near.length>=AT_LEAST&&(centre===null||near.length>centre.near.length))centre={item,near};
  }
  if(centre===null)return null;
  const cluster=[centre.item,...centre.near];
  const sum=cluster[0].vector.map((_,i)=>cluster.reduce((total,item)=>total+item.vector[i],0));
  return Object.freeze({centreRef:centre.item.ref,vector:unit(sum),
    texts:Object.freeze(cluster.slice(0,WORDS).map(item=>item.text.slice(0,WORDS_CHARS)))});
}

const NAME_SCHEMA=Object.freeze({type:"object",additionalProperties:false,required:["ground"],
  properties:{ground:{anyOf:[{type:"string",minLength:1,maxLength:120},{type:"null"}]}}});

// Keeps the name current: when the ground has moved or the name is old, the
// Thread names it again. Never fails the caller; a ground it does not name
// is left unnamed.
export function createRepeatedGroundNaming({experienceStore,modelAdapter,log=null}){
  const able=typeof experienceStore?.recordRepeatedGround==="function"&&typeof modelAdapter?.invoke==="function";
  return Object.freeze({
    async refresh({threadId,at}){
      if(!able)return null;
      try{
        const ground=repeatedGround({experienceStore,threadId,at});
        if(ground===null)return null;
        const named=experienceStore.getRepeatedGround(threadId);
        if(named!==null&&closeness(named.vector,ground.vector)>=SAME_NAME
          &&Date.parse(at)-Date.parse(named.at)<RENAME_MS)return named;
        const input={ownWords:ground.texts};
        const result=await modelAdapter.invoke({...promptRequest("experience.repeated-ground",{threadId}),
          input,responseSchema:NAME_SCHEMA,
          clientRequestId:`repeated-ground_${sha256(canonicalJson({threadId,input}))}`});
        assertPlainObject("repeated ground output",result.output);
        assertExactKeys("repeated ground output",result.output,["ground"]);
        const name=typeof result.output.ground==="string"
          ?result.output.ground.trim().replace(/^["“'‘]|["”'’.]$/gu,"").slice(0,120):"";
        if(!name)return null;
        experienceStore.recordRepeatedGround({threadId,at,centreRef:ground.centreRef,
          vector:encodeMeaning(ground.vector),name});
        return experienceStore.getRepeatedGround(threadId);
      }catch(error){
        log?.(JSON.stringify({event:"repeated-ground",threadId,outcome:"failed",
          error:String(error?.message??error).slice(0,200)}));
        return null;
      }
    },
  });
}

// The name, while the ground it names is still where the Thread's exchanges
// cluster lately; it fades from the Body's words when the Thread has moved on.
export function repeatedGroundName({experienceStore,threadId,at}){
  const named=experienceStore?.getRepeatedGround?.(threadId)??null;
  if(named===null||Date.parse(at)-Date.parse(named.at)>RENAME_MS)return null;
  return named.name;
}
