// Birth execution is not the Thread's historical childhood. All status
// facts come from Birth Center; the absence of a bounded match proves nothing.
export function genesisExecutionEvidence({requestId,pending=[],stillborn=[],inspection=null}={}){
  const active=pending.find(item=>item?.requestId===requestId)??null;
  const terminal=stillborn.find(item=>item?.requestId===requestId)??null;
  const detail=inspection?.requestId===requestId?inspection:null;
  const state=terminal?"stillborn":active?"pending"
    :detail?.disposition?.outcome==="born"?"born"
      :detail?.disposition?.outcome==="stillborn"?"stillborn"
        :detail?"inspected_only":"not_in_bounded_lists";
  const source=terminal??active??null;
  const stages=Object.freeze([
    {name:"Genesis request",observed:Boolean(source||detail)},
    {name:"Historical realization",observed:Boolean(detail?.provisionalStatus)},
    {name:"Memory and meaning",observed:false},
    {name:"World publication",observed:detail?.disposition?.outcome==="born"},
  ]);
  return Object.freeze({
    requestId,state,source,inspection:detail,
    threadId:source?.threadId??detail?.threadId??null,
    genesisId:source?.genesisId??detail?.genesisId??null,
    currentStage:source?.stage??null,
    status:source?.status??detail?.requestStatus??null,
    failure:terminal?.failureMessage??active?.error??detail?.disposition?.failureMessage??null,
    failureCode:terminal?.failureCode??active?.failureCode
      ??detail?.disposition?.failureCode??null,
    publication:state==="stillborn"?"world_confirmed_not_admitted"
      :state==="born"?"birth_center_confirmed_born":"not_established",
    stages,
  });
}
