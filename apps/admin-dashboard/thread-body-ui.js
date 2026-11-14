// The Body panel in the Thread Observatory (body levels): the social Body
// over the last day, the words the Thread reads of it now, and the genes
// that shape it. Loaded only when an operator asks for it.
import { BODY_STATES, PERSON_STATES, eventTicks, geneticsRows, sparkPoints } from "./thread-body-model.mjs";

const SVG="http://www.w3.org/2000/svg";
const WIDTH=220,HEIGHT=40;

function el(tag,className=null,text=null){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
}
function svg(tag,attributes={}){
  const node=document.createElementNS(SVG,tag);
  for(const [name,value] of Object.entries(attributes))node.setAttribute(name,String(value));
  return node;
}
const fixed=(value)=>value===null||value===undefined?"—":Number(value).toFixed(2);
const hour=(at)=>new Date(at).toISOString().slice(11,16);

function spark(values,{range,ticks=[],from,to,baseline=null}){
  const box=svg("svg",{viewBox:`0 0 ${WIDTH} ${HEIGHT}`,width:WIDTH,height:HEIGHT,class:"thread-body-spark",role:"img"});
  if(range[0]<0)box.append(svg("line",{x1:0,x2:WIDTH,y1:HEIGHT/2,y2:HEIGHT/2,class:"thread-body-zero"}));
  for(const tick of eventTicks(ticks,{from,to,width:WIDTH})){
    const mark=svg("line",{x1:tick.x,x2:tick.x,y1:HEIGHT-6,y2:HEIGHT,class:"thread-body-tick"});
    const title=svg("title");
    title.textContent=`${hour(tick.event.at)} ${[tick.event.kind,tick.event.reading,tick.event.act,tick.event.by]
      .filter(Boolean).join(" ")}`;
    mark.append(title);
    box.append(mark);
  }
  if(baseline!==null)box.append(svg("polyline",{points:sparkPoints(baseline,{range,width:WIDTH,height:HEIGHT}),
    class:"thread-body-base"}));
  box.append(svg("polyline",{points:sparkPoints(values,{range,width:WIDTH,height:HEIGHT}),class:"thread-body-line"}));
  return box;
}

function renderBody(body){
  const view=el("div","thread-body");
  const from=body.series[0]?.at,to=body.series.at(-1)?.at;
  if(body.felt?.length){
    const felt=el("ul","thread-body-felt");
    for(const line of body.felt)felt.append(el("li",null,line));
    view.append(el("h4",null,"What it reads of its Body now"),felt);
  }
  const states=el("div","thread-body-grid");
  for(const state of BODY_STATES){
    const values=body.series.map(point=>point[state.key]);
    const card=el("div","thread-body-card");
    card.title=state.note??"";
    card.append(el("span","thread-person-label",state.label),el("strong",null,fixed(values.at(-1))),
      spark(values,{range:state.range,ticks:body.events?.[state.events]??[],from,to,
        baseline:state.baselineKey?body.series.map(point=>point[state.baselineKey]??null):null}));
    states.append(card);
  }
  view.append(el("h4",null,`The last ${body.window.hours} hours`),states);
  if(body.people.length){
    const table=el("table","thread-body-people");
    const head=el("tr");
    head.append(el("th",null,"Person"),...PERSON_STATES.map(state=>{
      const cell=el("th",null,state.label);cell.title=state.note??"";return cell;}));
    table.append(head);
    for(const person of body.people){
      const row=el("tr");
      row.append(el("td",null,person.name??person.threadId));
      for(const state of PERSON_STATES){
        const values=body.series.map(point=>point.people?.[person.threadId]?.[state.key]??null);
        const cell=el("td");
        cell.append(el("strong",null,fixed(values.at(-1))),
          spark(values,{range:state.range,from,to,ticks:(body.events?.regard??[])
            .filter(event=>event.person===person.threadId)}));
        row.append(cell);
      }
      table.append(row);
    }
    view.append(el("h4",null,"Toward the people it lived most with"),table);
  }
  const genes=el("details","thread-data-section");
  const rows=geneticsRows(body.genetics);
  genes.append(el("summary",null,`Inherited urges (${rows.length})`));
  const table=el("table","thread-body-genes");
  const head=el("tr");
  head.append(...["Family","Direction","Gain","Threshold","Persistence","Self-regard","Stubbornness"].map(name=>el("th",null,name)));
  table.append(head);
  for(const row of rows){
    const line=el("tr");
    line.append(el("td",null,row.family),el("td",null,row.orientation),
      ...["gain","feltThreshold","persistence","selfRegard","stubbornness"].map(name=>el("td",null,
        row.positions[name]===undefined?"":fixed(row.positions[name]))));
    table.append(line);
  }
  genes.append(table);
  view.append(genes);
  return view;
}

// The section, with the Body read only on request.
export function bodySection(threadId){
  const wrap=el("section","thread-person-section");
  const head=el("div","thread-person-section-head");
  head.append(el("h3",null,"Body"),el("span",null,"On demand · the last day"));
  const button=el("button","secondary","Show the Body");
  button.type="button";
  const out=el("div");
  button.addEventListener("click",async()=>{
    button.disabled=true;
    out.replaceChildren(el("p","thread-loading","Reading the Body…"));
    try{
      const response=await fetch(`/api/threads/${encodeURIComponent(threadId)}/observatory?view=body`,
        {headers:{Accept:"application/json"},cache:"no-store"});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||!payload?.observatory?.body)throw new Error(payload?.error?.code??`HTTP ${response.status}`);
      out.replaceChildren(renderBody(payload.observatory.body));
      button.textContent="Read again";
    }catch(error){
      out.replaceChildren(el("p","thread-empty-note",`The Body could not be read: ${error.message}`));
    }finally{button.disabled=false;}
  });
  wrap.append(head,button,out);
  return wrap;
}
