// Passing tests assert their evidence silently; detailed reports are opt-in.
export function reportTestEvidence(label,evidence,{env=process.env,log=console.log}={}){
  if(env.FIBRE_TEST_EVIDENCE==="1")
    log(label+" "+JSON.stringify(evidence));
}
