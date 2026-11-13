// Body levels (body-levels design, Guy, November 13): every Body state is a
// baseline, the slow level that what life has been like sets, plus spikes
// that events add and that fade back to it. A calm Body stung returns to a
// low baseline; a stubborn one with a grievance returns to a high one.
//
// Pure: it reads only the events it is given and stores nothing. The same
// events evaluated at earlier moments give the state as it was then.
//
// The baseline is one of:
//   given      a lasting fact computed elsewhere (a gap, a bond);
//   accumulate a share of every event, fading over a long half-life or never;
//   track      moved part of the way toward each event's value, never fading.
// Spikes fade with the state's half-life or an event's own. A reservoir (cap)
// fills with each event, never above the cap, and drains between them.
// The genome speaks through the caller: gain sizes the events, persistence
// stretches the half-life (inheritedHalfLife), a baseline rate sets track.

export const HOUR_MS=3_600_000;
export const DAY_MS=86_400_000;

const ms=(at)=>typeof at==="number"?at:Date.parse(at);

// What remains of a value after some time, halving every half-life.
export function fade(value,elapsedMs,halfLifeMs){
  if(halfLifeMs===Infinity)return value;
  return value*2**(-Math.max(0,elapsedMs)/halfLifeMs);
}

// A family's half-life, stretched or shortened by its inherited persistence
// (already scaled by inherited spread).
export const inheritedHalfLife=(halfLifeMs,persistence=0)=>halfLifeMs*2**(2*persistence);

// The spikes still felt at a moment: summed, or the strongest one.
function spikesAt({events,now,halfLife,combine,cap}){
  if(cap!==null){
    let level=0,last=null;
    for(const event of events){
      if(last!==null)level=fade(level,ms(event.at)-last,halfLife);
      level=Math.min(cap,level+event.size);
      last=ms(event.at);
    }
    return last===null?0:fade(level,now-last,halfLife);
  }
  const values=events.filter(event=>event.size!==undefined)
    .map(event=>fade(event.size,now-ms(event.at),event.halfLife??halfLife));
  return combine==="max"?Math.max(0,...values):values.reduce((sum,value)=>sum+value,0);
}

function baselineAt({baseline,events,now}){
  if(baseline===null)return 0;
  if(typeof baseline.given==="number")return baseline.given;
  if(baseline.accumulate){
    const {share=1,halfLife=Infinity}=baseline.accumulate;
    return events.reduce((sum,event)=>sum
      +fade(event.toBaseline??share*(event.size??0),now-ms(event.at),halfLife),0);
  }
  if(baseline.track){
    let level=baseline.track.start??0;
    for(const event of events)
      if(event.value!==undefined)level+=(event.rate??baseline.track.rate)*(event.value-level);
    return level;
  }
  throw new TypeError("a Body level's baseline is given, accumulated or tracked");
}

// The bound a state lives within: a clamp, or a saturation 1 − 2^(−x/k).
function bounded(value,bound){
  if(bound===null)return value;
  if(bound.saturate!==undefined)return 1-2**(-Math.max(0,value)/bound.saturate);
  return Math.min(bound.max??Infinity,Math.max(bound.min??-Infinity,value));
}

// A Body state at a moment. Events ({at, size?, value?, rate?, halfLife?,
// toBaseline?}) after the moment are not yet lived and are left out; events
// at the same moment keep the order given.
export function bodyLevel({at,events=[],halfLife=Infinity,combine="sum",cap=null,baseline=null,bound=null}){
  const now=ms(at);
  const lived=events.map((event,index)=>({event,index}))
    .filter(({event})=>ms(event.at)<=now)
    .sort((a,b)=>ms(a.event.at)-ms(b.event.at)||a.index-b.index)
    .map(({event})=>event);
  const base=baselineAt({baseline,events:lived,now});
  const deviation=spikesAt({events:lived,now,halfLife,combine,cap});
  return Object.freeze({baseline:base,deviation,level:bounded(base+deviation,bound)});
}
