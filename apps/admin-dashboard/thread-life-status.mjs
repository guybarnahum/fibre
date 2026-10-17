// A scheduled life is different from an active model lease or a recently changed scene.
// Classify only from World-authored plan coverage and its durable wake frontier.
export function threadLifeStatus({
  currentAt=null,planHorizonEnd=null,nextAutonomousBoundary=null,
}={},at=Date.now()){
  if(currentAt===null)return "unstarted";
  const horizon=Date.parse(planHorizonEnd??"");
  if(!Number.isFinite(horizon))return "unknown";
  const boundary=nextAutonomousBoundary;
  if(boundary?.blockedReason)return "blocked";
  if(horizon<=at)return "dormant";
  if(!boundary?.dueAt)return "unarmed";
  const due=Date.parse(boundary.dueAt);
  if(!Number.isFinite(due))return "unarmed";
  if(due<at-120_000)return "overdue";
  return "continuing";
}

export function threadLifeDescription(status,{
  currentAt=null,planHorizonEnd=null,nextAutonomousBoundary=null,
}={}){
  const labels={
    continuing:"Continuing life",overdue:"Life wake overdue",
    unarmed:"Life not scheduled",dormant:"Dormant life",
    blocked:"Life scheduler blocked",unstarted:"Life not established",
    unknown:"Life status unknown",
  };
  const facts=[labels[status]??labels.unknown];
  if(currentAt)facts.push("Last enacted: "+currentAt);
  if(planHorizonEnd)facts.push("Plan through: "+planHorizonEnd);
  if(nextAutonomousBoundary?.dueAt)facts.push("Next wake: "+nextAutonomousBoundary.dueAt);
  if(nextAutonomousBoundary?.blockedReason)facts.push("Blocked: "+nextAutonomousBoundary.blockedReason);
  return facts.join(" · ");
}
