const HEADERS=Object.freeze([
  "SEX",
  "STRUCTURAL MORPHOLOGY",
  "REFERENCE GEOMETRY STATE",
  "SURFACE PHENOTYPE",
  "REFERENCE SURFACE STATE",
]);

const STRUCTURAL_ALIASES=Object.freeze({
  faceWidth:"faceBreadth",
  jawWidth:"jawBreadth",
  browProminence:"brow",
  noseWidth:"noseBreadth",
  lipFullness:"softTissue",
  heightTendency:"height",
});

const SURFACE_ALIASES=Object.freeze({
  eyeColor:"eyePigmentation",
  hairColor:"hairPigmentation",
  hairTexture:"hairForm",
});

function sentenceParts(value){
  return String(value??"").trim().split(/\.\s+(?=[A-Z])/u).map((part)=>part.replace(/\.$/u,"").trim()).filter(Boolean);
}

function pairs(value){
  const out=[];
  for(const part of String(value??"").split(";")){
    const match=/^\s*([A-Za-z][A-Za-z0-9]+):\s*(.+?)\s*$/u.exec(part);
    if(match)out.push(Object.freeze({key:match[1],value:match[2]}));
  }
  return out;
}

function groupSentence(sentence){
  const match=/^(.+?):\s+((?:[A-Za-z][A-Za-z0-9]+:\s).+)$/u.exec(sentence);
  if(!match)return null;
  const rows=pairs(match[2]);
  return rows.length?Object.freeze({title:match[1],rows}):null;
}

function coordinateValue(value){
  const match=/^(-?\d+(?:\.\d+)?)\s+\((.+)\)$/u.exec(String(value??""));
  if(!match)return Object.freeze({value:String(value??""),meaning:null});
  return Object.freeze({value:match[1],meaning:match[2]});
}

function coordinateMap(sentences,prefixes){
  const map=new Map();
  for(const sentence of sentences){
    const prefix=prefixes.find((candidate)=>sentence.startsWith(candidate));
    if(!prefix)continue;
    for(const row of pairs(sentence.slice(prefix.length))){
      map.set(row.key,coordinateValue(row.value));
    }
  }
  return map;
}

function enrichGroups(groups,coordinates,aliases={}){
  const used=new Set();
  const enriched=groups.map((group)=>Object.freeze({
    title:group.title
      .replace(/^Identity-critical inherited facial geometry — /u,"")
      .replace(/^Inherited /u,""),
    rows:Object.freeze(group.rows.map((row)=>{
      const coordinateKey=aliases[row.key]??row.key;
      const coordinate=coordinates.get(coordinateKey)??null;
      if(coordinate)used.add(coordinateKey);
      return Object.freeze({...row,coordinate});
    })),
  }));
  const extra=[...coordinates.entries()]
    .filter(([key])=>!used.has(key))
    .map(([key,coordinate])=>Object.freeze({key,value:null,coordinate}));
  if(extra.length)enriched.push(Object.freeze({title:"Additional precision",rows:Object.freeze(extra)}));
  return Object.freeze(enriched);
}

function structuralLayer(value){
  const sentences=sentenceParts(value);
  const coordinates=coordinateMap(sentences,[
    "Continuous facial coordinates are secondary precision and preserve this individual's proportions inside the semantic anatomy: ",
    "Other continuous inherited structural coordinates: ",
  ]);
  const groups=sentences
    .map(groupSentence)
    .filter(Boolean)
    .filter((group)=>!group.title.startsWith("Continuous ")&&!group.title.startsWith("Other continuous "));
  const guidance=sentences.filter((sentence)=>(
    !groupSentence(sentence)
    && !sentence.startsWith("Continuous facial coordinates")
    && !sentence.startsWith("Other continuous inherited structural coordinates")
  ));
  return Object.freeze({
    groups:enrichGroups(groups,coordinates,STRUCTURAL_ALIASES),
    notes:Object.freeze(guidance),
  });
}

function surfaceLayer(value){
  const sentences=sentenceParts(value);
  const coordinates=coordinateMap(sentences,["Continuous inherited surface coordinates: "]);
  const groups=sentences
    .map(groupSentence)
    .filter(Boolean)
    .filter((group)=>!group.title.startsWith("Continuous inherited surface coordinates"));
  const guidance=sentences.filter((sentence)=>(
    !groupSentence(sentence)
    && !sentence.startsWith("Continuous inherited surface coordinates")
  ));
  return Object.freeze({
    groups:enrichGroups(groups,coordinates,SURFACE_ALIASES),
    notes:Object.freeze(guidance),
  });
}

function simpleLayer(value){
  const sentences=sentenceParts(value);
  const groups=[];
  const notes=[];
  for(const sentence of sentences){
    const group=groupSentence(sentence);
    if(group)groups.push(group);
    else notes.push(sentence);
  }
  return Object.freeze({groups:Object.freeze(groups),notes:Object.freeze(notes)});
}

export function parseCanonicalAppearancePresentation(description){
  if(typeof description!=="string"||description.trim()==="")return null;
  const lines=description.trim().split("\n");
  const version=/^CANONICAL APPEARANCE LAYERS\s+(.+)$/u.exec(lines[0]??"")?.[1]??null;
  if(!version||lines.length!==11)return null;
  for(let index=0;index<HEADERS.length;index++){
    if(lines[1+index*2]!==HEADERS[index])return null;
  }
  return Object.freeze({
    version,
    sex:lines[2].trim(),
    structural:structuralLayer(lines[4]),
    referenceGeometry:simpleLayer(lines[6]),
    surface:surfaceLayer(lines[8]),
    referenceSurface:simpleLayer(lines[10]),
  });
}

export function humanAppearanceKey(value){
  return String(value??"")
    .replace(/([a-z0-9])([A-Z])/gu,"$1 $2")
    .replace(/[-_]+/gu," ")
    .replace(/^./u,(letter)=>letter.toUpperCase());
}
