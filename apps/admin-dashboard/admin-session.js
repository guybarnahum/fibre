(()=>{
  const nativeFetch=window.fetch.bind(window);
  let expired=false;
  let probePromise=null;

  function apiRequest(input){
    try{
      const raw=typeof input==="string"||input instanceof URL?input:input?.url;
      if(!raw)return false;
      const url=new URL(raw,window.location.href);
      return url.origin===window.location.origin&&url.pathname.startsWith("/api/");
    }catch{return false}
  }

  function showExpired(){
    if(expired)return;
    expired=true;
    document.documentElement.classList.add("admin-session-expired");

    const dialog=document.createElement("dialog");
    dialog.className="admin-session-dialog";
    dialog.setAttribute("aria-labelledby","admin-session-title");

    const copy=document.createElement("div");
    copy.className="admin-session-copy";
    const eyebrow=document.createElement("p");
    eyebrow.className="eyebrow";
    eyebrow.textContent="Admin session";
    const title=document.createElement("h2");
    title.id="admin-session-title";
    title.textContent="Sign-in expired";
    const detail=document.createElement("p");
    detail.textContent="Your Cloudflare Access session is no longer valid. Sign in again to continue using Admin.";
    copy.append(eyebrow,title,detail);

    const action=document.createElement("button");
    action.type="button";
    action.className="primary";
    action.textContent="Sign in again";
    action.addEventListener("click",()=>window.location.reload());

    dialog.append(copy,action);
    document.body.append(dialog);
    dialog.showModal();
  }

  async function responseExpired(response){
    if(response.status===401)return true;
    if(response.status===403){
      try{
        const payload=await response.clone().json();
        return payload?.error==="access_required";
      }catch{return false}
    }
    if(!response.redirected)return false;
    try{
      return new URL(response.url,window.location.href).origin!==window.location.origin;
    }catch{return true}
  }

  async function probeSession(){
    if(expired||probePromise)return probePromise;
    probePromise=(async()=>{
      try{
        const response=await nativeFetch(window.location.href,{
          method:"GET",
          credentials:"include",
          cache:"no-store",
          redirect:"manual",
        });
        if(response.status===401||response.status===403||response.type==="opaqueredirect"){
          showExpired();
        }
      }catch{
        // A failed probe is indistinguishable from ordinary connectivity loss.
        // Leave the current error visible rather than claiming the session expired.
      }finally{
        probePromise=null;
      }
    })();
    return probePromise;
  }

  window.fetch=async(...args)=>{
    const adminApi=apiRequest(args[0]);
    try{
      const response=await nativeFetch(...args);
      if(adminApi&&await responseExpired(response))showExpired();
      return response;
    }catch(error){
      if(adminApi&&navigator.onLine)void probeSession();
      throw error;
    }
  };
})();
