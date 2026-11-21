// Meaning of exchanges (S5b repair, Guy, November 20): World's fact of how
// far an exchange goes over ground a Thread has already covered, by meaning
// rather than shared words, so ground reworded is still the same ground.
// Each exchange's words are embedded once, through a replaceable embedding
// port, and kept a week as a derived index of public words: never memory,
// never shown to the Thread. Without the port, shared words are the measure.
import { repetitionOf, recentExchanges, sameGround } from "./engagement.mjs";
import { encodeMeaning, meaningSameness, unit } from "./meaning-vectors.mjs";

export function createExchangeMeaning({embedder=null,experienceStore,log=null}={}){
  const measured=embedder!==null&&typeof embedder?.embed==="function"
    &&typeof experienceStore?.exchangeMeanings==="function";

  // The meanings of these texts and of earlier exchanges, embedding in one
  // call whatever has not been measured yet; earlier ones are kept.
  async function meaningsOf(texts,exchanges){
    const known=experienceStore.exchangeMeanings(exchanges.map(item=>item.ref));
    const missing=exchanges.filter(item=>!known.has(item.ref));
    const {vectors,modelId}=await embedder.embed([...texts,...missing.map(item=>item.text)]);
    if(missing.length>0)experienceStore.recordExchangeMeanings(missing.map((item,index)=>({
      ref:item.ref,at:item.at,model:modelId,vector:encodeMeaning(vectors[texts.length+index])})));
    const earlier=exchanges.map(item=>known.get(item.ref)?.vector
      ??unit(vectors[texts.length+missing.indexOf(item)]));
    return {current:vectors.slice(0,texts.length).map(unit),earlier};
  }

  // The words for an exchange, with the measure behind them.
  async function judged(threadId,work,fallback){
    if(!measured)return fallback();
    const startedAt=Date.now();
    try{
      const ground=await work();
      log?.(JSON.stringify({event:"meaning-call",threadId,outcome:"completed",elapsedMs:Date.now()-startedAt}));
      return ground;
    }catch(error){
      log?.(JSON.stringify({event:"meaning-call",threadId,outcome:"failed",elapsedMs:Date.now()-startedAt,
        error:String(error?.message??error).slice(0,200)}));
      return fallback();
    }
  }

  return Object.freeze({
    measured,
    // Whether an exchange goes over ground this Thread covered lately.
    async sameGround({threadId,text,at,excludeRefs=[]}){
      if(!text)return null;
      const exchanges=recentExchanges({experienceStore,threadId,at,excludeRefs})
        .filter(item=>!text.includes(item.text.trim()));
      const words=()=>sameGround(repetitionOf({current:text,earlier:exchanges.map(item=>item.text)}));
      if(exchanges.length===0)return null;
      return judged(threadId,async()=>{
        const {current,earlier}=await meaningsOf([text],exchanges);
        return sameGround(meaningSameness(current[0],earlier),{measure:"meaning"});
      },words);
    },
    // A conversation under way: against this Thread's earlier exchanges, and
    // whether its last turns go back over its own first ones; the stronger.
    async conversationGround({threadId,utterances,at,earlier:exchanges=null}){
      const text=utterances.join(" ");
      if(!text)return null;
      const recent=(exchanges??recentExchanges({experienceStore,threadId,at}))
        .filter(item=>!text.includes(item.text.trim()));
      const tail=utterances.length>=6?utterances.slice(-3).join(" "):null;
      const head=tail===null?null:utterances.slice(0,-3).join(" ");
      const words=()=>{
        const against=recent.length?repetitionOf({current:text,earlier:recent.map(item=>item.text)}):0;
        const circling=tail===null?0:repetitionOf({current:tail,earlier:[head]});
        return sameGround(Math.max(against,circling));
      };
      if(recent.length===0&&tail===null)return null;
      return judged(threadId,async()=>{
        const {current,earlier}=await meaningsOf(tail===null?[text]:[text,tail,head],recent);
        const against=meaningSameness(current[0],earlier);
        const circling=tail===null?0:meaningSameness(current[1],[current[2]]);
        return sameGround(Math.max(against,circling),{measure:"meaning"});
      },words);
    },
  });
}
