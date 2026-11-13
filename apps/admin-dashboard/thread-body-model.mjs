// The Body panel's model (body levels): what each charted state is and how
// a day of it is drawn. Presentation only; the values are World's.

// The social Body as a whole, over the day.
export const BODY_STATES=Object.freeze([
  Object.freeze({key:"battery",label:"Spent by talk",range:[0,1],events:"exposures"}),
  Object.freeze({key:"weariness",label:"Weary of the same",range:[0,1],events:"readings"}),
  Object.freeze({key:"self",label:"Where it holds it stands",range:[-1,1],events:"regard"}),
  Object.freeze({key:"gap",label:"Self-view against treatment",range:[-1,1],events:"regard",
    note:"below zero: it holds itself higher than it is treated (frustration)"}),
]);

// Toward each of the people it lived most with.
export const PERSON_STATES=Object.freeze([
  Object.freeze({key:"trust",label:"Trust",range:[0,1]}),
  Object.freeze({key:"hurt",label:"Hurt",range:[0,1]}),
  Object.freeze({key:"knowing",label:"Knowing",range:[0,1]}),
  Object.freeze({key:"bond",label:"Bond",range:[0,1]}),
  Object.freeze({key:"held",label:"Held place",range:[-1,1],note:"above zero: it holds them above itself"}),
  Object.freeze({key:"treated",label:"Treated place",range:[-1,1],note:"where their treatment places them"}),
]);

const POSITIONS=Object.freeze(["gain","feltThreshold","persistence","selfRegard","stubbornness"]);

// Each inherited urge with its direction and every position it carries.
export function geneticsRows(urgeProjection=[]){
  return urgeProjection.map(locus=>Object.freeze({family:locus.family,kind:locus.kind,
    orientation:locus.orientation,
    positions:Object.freeze(Object.fromEntries(POSITIONS.filter(name=>typeof locus.positions?.[name]==="number")
      .map(name=>[name,locus.positions[name]])))}))
    .sort((a,b)=>a.family.localeCompare(b.family));
}

// A day of one state as a polyline in a width × height box; a moment
// without a value breaks nothing, it is simply left out.
export function sparkPoints(values,{range:[low,high],width,height}){
  const step=values.length>1?width/(values.length-1):0;
  return values.map((value,index)=>value===null||value===undefined?null
    :`${(index*step).toFixed(1)},${(height-(Math.min(high,Math.max(low,value))-low)/(high-low)*height).toFixed(1)}`)
    .filter(Boolean).join(" ");
}

// Where in the day each event fell, as an x in the same box.
export function eventTicks(events,{from,to,width}){
  const start=Date.parse(from),span=Date.parse(to)-start;
  return events.map(event=>({x:Math.round((Date.parse(event.at)-start)/span*width*10)/10,event}))
    .filter(tick=>tick.x>=0&&tick.x<=width);
}
