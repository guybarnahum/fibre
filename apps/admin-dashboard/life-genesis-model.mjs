// Birth execution is not the Thread's historical childhood. All status
// facts come from Birth Center; the absence of a bounded match proves nothing.
export function genesisExecutionEvidence({requestId,lifecycle=null,pending=[],stillborn=[],inspection=null}={}){
  const modern=lifecycle?.requestId===requestId?lifecycle:null;
  const active=modern??pending.find(item=>item?.requestId===requestId)??null;
  const terminal=stillborn.find(item=>item?.requestId===requestId)??null;
  const detail=inspection?.requestId===requestId?inspection:null;
  const state=modern?["complete","unlocated"].includes(modern.stage)?"born"
    :modern.stage==="stillborn"?"stillborn":"pending"
    :terminal||detail?.disposition?.outcome==="stillborn"?"stillborn"
    :detail?.disposition?.outcome==="born"?"born"
      :active?"pending":detail?"inspected_only":"not_in_bounded_lists";
  const source=modern??terminal??active??null;
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
  });
}
