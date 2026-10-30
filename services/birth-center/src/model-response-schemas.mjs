import {PLACE_POPULATION_SCHEMA,NAMING_TRADITION_SCHEMA} from "./place-population.mjs";
import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  GENESIS_PASS_B_RESPONSE_SCHEMA,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "./genesis-development-contracts.mjs";

// One inventory of the actual schemas sent by Birth Center: the two authored
// priors and the five Genesis cognition/repair response forms. It is used
// unchanged by static validation and the deployed provider preflight.
export const BIRTH_RESPONSE_SCHEMAS=Object.freeze([
  {name:"Place Population",role:"population",schema:PLACE_POPULATION_SCHEMA},
  {name:"Naming Tradition",role:"authoring",schema:NAMING_TRADITION_SCHEMA},
  {name:"Genesis Pass-A",role:"creative",schema:GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA},
  {name:"Genesis Pass-A repair",role:"repair",schema:GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA},
  {name:"Genesis Pass-B",role:"creative",schema:GENESIS_PASS_B_RESPONSE_SCHEMA},
  {name:"Genesis Pass-C initial",role:"creative",schema:GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA},
  {name:"Genesis Pass-C reinterpretation",role:"creative",schema:GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA},
]);

// The JS runtime can parse Unicode expressions that the deployed OpenAI schema
// parser cannot. Reject known unsupported constructs before any live birth.
export function assertBirthResponseSchemaPatterns({name,schema}){
  function visit(node,path){
    if(!node||typeof node!=="object")return;
    if(Array.isArray(node)){node.forEach((child,i)=>visit(child,path+"["+i+"]"));return;}
    if(typeof node.pattern==="string"){
      const pattern=node.pattern;
      if(/\\[pPbB]/u.test(pattern)||/\\[1-9]/u.test(pattern)
        ||/\\k</u.test(pattern)||/\(\?(?:[=!]|<[=!])/u.test(pattern)){
        throw new Error("Birth schema "+name+" field "+path+
          " has unsupported OpenAI regex: "+pattern);
      }
      try{new RegExp(pattern,"u");}
      catch(error){throw new Error("Birth schema "+name+" field "+path+
        " has invalid regex: "+error.message);}
    }
    for(const [key,value] of Object.entries(node))if(key!=="pattern")
      visit(value,path+"."+key);
  }
  visit(schema,"$");
  return schema;
}
