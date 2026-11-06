// Operator-only measures of how a conversation went, computed where the words
// are and returned as numbers; never model-visible, never a Thread input, and
// never authority over what a conversation meant to the people in it. The
// word lists are English heuristics: other languages read as neither assent
// nor pushback, and scripts without spaces barely overlap.
const QUESTION=/[?？؟]/u;
const ASSENT=/^(?:yes|yeah|yep|exactly|absolutely|right|true|agreed|indeed|definitely|totally|sure|of course|i agree|that(?:'|’)?s (?:so |very )?(?:true|right|it|a (?:good|great|lovely|nice|beautiful) (?:point|idea|thought|way))|that makes (?:a lot of )?sense|good point|i (?:like|love) that|mm+|oh,? yes)\b/iu;
const PUSHBACK=/\b(?:but|though|however|actually|i disagree|i(?:'|’)?m not sure|i don(?:'|’)?t think|not quite|on the other hand|rather than|instead)\b|^no\b/iu;
const STOP=new Set(("about after again also because been before being could does doing down even every from have here into just like little made make many more most much must only other over really same said should since some such than that their them then there these they thing things this those through very want were what when where which while will with would your yours you're it's that's i'm don't").split(" "));

function opening(text){
  return text.replace(/^[\s"“”'‘’*_—–-]+/u,"");
}

export function utteranceShape(text){
  const words=opening(text);
  return {question:QUESTION.test(text),assent:ASSENT.test(words),pushback:PUSHBACK.test(words)};
}

export function contentWords(texts){
  const words=new Set();
  for(const text of texts){
    for(const word of text.toLocaleLowerCase().match(/\p{L}[\p{L}'’]{3,}/gu)??[]){
      if(!STOP.has(word))words.add(word);
    }
  }
  return words;
}

// The largest share of words this conversation has in common with any
// conversation between other people on the same day (Jaccard).
export function topicOverlap(conversations){
  return conversations.map((talk)=>{
    let most=0;
    for(const other of conversations){
      if(other===talk||other.day!==talk.day||other.pairKey===talk.pairKey)continue;
      let shared=0;
      for(const word of talk.words)if(other.words.has(word))shared+=1;
      const union=talk.words.size+other.words.size-shared;
      if(union>0)most=Math.max(most,shared/union);
    }
    return Math.round(most*100)/100;
  });
}
