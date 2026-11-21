// Meaning vectors (S5b repair): stored compactly and compared, for World's
// fact of how far an exchange repeats a Thread's earlier ones. Pure.

// Cosine at or below LOW is other ground, at or above HIGH the same said
// again; between, a share. Provisional for bge-m3, to be set from staging.
const LOW=0.55;
const HIGH=0.9;
const NEAREST=3;

export const unit=(vector)=>{
  const norm=Math.hypot(...vector);
  return norm===0?vector.map(()=>0):vector.map(value=>value/norm);
};
const cosine=(a,b)=>{
  let sum=0;
  for(let i=0;i<a.length;i+=1)sum+=a[i]*b[i];
  return sum;
};

// Stored compactly: a unit vector as signed bytes, base64.
export function encodeMeaning(vector){
  const bytes=Uint8Array.from(unit(vector).map(value=>Math.round(value*127)&0xff));
  let text="";
  for(const byte of bytes)text+=String.fromCharCode(byte);
  return btoa(text);
}
export function decodeMeaning(encoded){
  const text=atob(encoded);
  return unit(Array.from(text,char=>{const byte=char.charCodeAt(0);return byte>127?byte-256:byte;}));
}

// How much one exchange repeats earlier ones: the mean of its three closest,
// 0 new ground, 1 the same said again.
export function meaningSameness(vector,earlier){
  if(earlier.length===0)return 0;
  const closest=earlier.map(other=>cosine(vector,other)).sort((a,b)=>b-a).slice(0,NEAREST);
  const mean=closest.reduce((sum,value)=>sum+value,0)/closest.length;
  return Math.round(Math.min(1,Math.max(0,(mean-LOW)/(HIGH-LOW)))*1e6)/1e6;
}
