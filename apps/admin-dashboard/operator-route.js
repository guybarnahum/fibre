const OPERATOR_MODES=Object.freeze(new Set(["birth-center","threads","appearance","stillborn"]));

export function operatorModeFromLocation({pathname="",search=""}={}){
  const normalizedPath=String(pathname).replace(/\/+$/u,"")||"/";
  if(normalizedPath==="/appearance")return "appearance";
  const mode=new URLSearchParams(String(search)).get("mode");
  return OPERATOR_MODES.has(mode)?mode:null;
}
