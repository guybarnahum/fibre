// A chosen introduction only discloses the part of the speaker's own name
// actually spoken. This does not infer an introduction from unmarked prose.
const TOKEN=/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const escapeRegex=value=>value.replace(/[|\\{}()[\]^$+*?.-]/g,"\\$&");

export function spokenNameDisclosure(expression,canonicalName){
  if(typeof expression!=="string"||typeof canonicalName!=="string"
    ||!expression.trim()||!canonicalName.trim())return null;
  const full=canonicalName.trim();
  const boundary=value=>new RegExp(
    "(?<![\\p{L}\\p{N}])"+escapeRegex(value)+"(?![\\p{L}\\p{N}])","iu",
  );
  if(boundary(full).test(expression))return full;
  const names=[...full.matchAll(TOKEN)].map(match=>match[0]);
  const heard=names.map(name=>({name,at:expression.search(boundary(name))}))
    .filter(item=>item.at>=0).sort((a,b)=>a.at-b.at);
  return heard[0]?.name??null;
}
