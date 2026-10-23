// Presentation-only labels never replace authored World descriptions or place refs.
const LABELS=Object.freeze({
  home:"Home",school:"School",transit:"Transit setting",
  learning:"Learning place",commerce:"Shops / commerce",
});

export function genesisPlaceLabel(placeId){
  const match=/^place_(?:modern_[0-9a-f]{12}|[a-z0-9_-]+_[0-9a-f]{12})_(home|school|transit|learning|commerce)$/u
    .exec(placeId??"");
  return match===null?null:LABELS[match[1]];
}

// Situated-life display names are limited to 160 UTF-8 bytes. Nonmodern
// settings retain a readable excerpt rather than falling back to an opaque ID.
export function genesisEpisodePlaceName(place){
  const label=genesisPlaceLabel(place.placeId);
  if(label!==null)return label;
  const description=place.description.trim();
  if(Buffer.byteLength(description,"utf8")<=160)return description;
  let excerpt="";
  for(const character of description){
    if(Buffer.byteLength(excerpt+character+"…","utf8")>160)break;
    excerpt+=character;
  }
  return excerpt.trimEnd()+"…";
}
