const MIN=1;
const MAX=5;

function normalized(value){
  const number=Number(value);
  return Number.isInteger(number)&&number>=MIN&&number<=MAX?number:0;
}

export function starRatingValue(host){
  return normalized(host?.dataset?.value);
}

export function createStarRating({name,label,value=0}={}){
  if(typeof name!=="string"||name.trim()==="")throw new TypeError("star rating name is required");
  if(typeof label!=="string"||label.trim()==="")throw new TypeError("star rating label is required");

  const host=document.createElement("div");
  host.className="star-rating";
  host.dataset.ratingName=name;
  host.dataset.value=String(normalized(value));
  host.setAttribute("role","radiogroup");
  host.setAttribute("aria-label",label);

  const buttons=[];
  const selected=()=>starRatingValue(host);
  const paint=(preview=selected())=>{
    const current=selected();
    for(const button of buttons){
      const candidate=Number(button.dataset.ratingValue);
      button.classList.toggle("is-filled",candidate<=preview);
      button.classList.toggle("is-selected",candidate===current);
      button.setAttribute("aria-checked",String(candidate===current));
      button.tabIndex=candidate===(current||MIN)?0:-1;
    }
  };
  const choose=(value,{focus=false}={})=>{
    const next=normalized(value);
    if(next===0)return;
    host.dataset.value=String(next);
    paint();
    if(focus)buttons[next-MIN]?.focus();
    host.dispatchEvent(new Event("change",{bubbles:true}));
  };

  for(let value=MIN;value<=MAX;value+=1){
    const button=document.createElement("button");
    button.type="button";
    button.className="star-rating-star";
    button.dataset.ratingValue=String(value);
    button.setAttribute("role","radio");
    button.setAttribute("aria-label",value+" of "+MAX);
    button.title=value+" of "+MAX;
    button.textContent="★";
    button.addEventListener("mouseenter",()=>paint(value));
    button.addEventListener("focus",()=>paint(value));
    button.addEventListener("mouseleave",()=>paint());
    button.addEventListener("blur",()=>paint());
    button.addEventListener("click",()=>choose(value));
    button.addEventListener("keydown",(event)=>{
      let next=null;
      if(["ArrowRight","ArrowUp"].includes(event.key))next=Math.min(MAX,(selected()||MIN)+1);
      else if(["ArrowLeft","ArrowDown"].includes(event.key))next=Math.max(MIN,(selected()||MIN)-1);
      else if(event.key==="Home")next=MIN;
      else if(event.key==="End")next=MAX;
      if(next===null)return;
      event.preventDefault();
      choose(next,{focus:true});
    });
    buttons.push(button);
    host.append(button);
  }

  paint();
  return host;
}
