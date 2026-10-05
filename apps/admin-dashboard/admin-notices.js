function host(){
  let node=document.getElementById("admin-notices");
  if(node)return node;
  node=document.createElement("section");
  node.id="admin-notices";
  node.className="admin-notices";
  node.setAttribute("aria-live","assertive");
  node.setAttribute("aria-label","Admin notifications");
  document.body.append(node);
  return node;
}

function keyOf({tone,title,message,detail}){
  return [tone,title,message,detail].map(value=>String(value??"")).join("\u0000");
}

export function showAdminNotice({
  tone="error",
  title,
  message,
  detail=null,
  sticky=tone==="error",
}={}){
  const container=host();
  const key=keyOf({tone,title,message,detail});
  const existing=[...container.children].find(node=>node.dataset.noticeKey===key);
  if(existing){
    existing.remove();
    container.prepend(existing);
    return existing;
  }

  const notice=document.createElement("article");
  notice.className="admin-notice admin-notice-"+tone;
  notice.dataset.noticeKey=key;

  const body=document.createElement("div");
  body.className="admin-notice-body";
  const heading=document.createElement("strong");
  heading.textContent=title??(tone==="error"?"Action failed":"Done");
  const text=document.createElement("span");
  text.textContent=message??"";
  body.append(heading,text);

  if(detail){
    const detailNode=document.createElement("small");
    detailNode.textContent=detail;
    body.append(detailNode);
  }

  const dismiss=document.createElement("button");
  dismiss.type="button";
  dismiss.className="admin-notice-dismiss";
  dismiss.setAttribute("aria-label","Dismiss notification");
  dismiss.textContent="×";
  dismiss.addEventListener("click",()=>notice.remove());

  notice.append(body,dismiss);
  container.prepend(notice);
  while(container.children.length>3)container.lastElementChild?.remove();

  if(!sticky)setTimeout(()=>notice.remove(),4500);
  return notice;
}

export function showActionError(error,title="Action failed"){
  const message=error instanceof Error?error.message:String(error);
  return showAdminNotice({tone:"error",title,message,sticky:true});
}
