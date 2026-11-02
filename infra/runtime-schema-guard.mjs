// A runtime World trusts an installed schema. Schema work is operator-owned.
const REPORTED=new Set();

export class RuntimeSchemaAccessError extends Error {
  constructor(label,kind){
    super(`runtime World schema access: ${label} (${kind})`);
    this.name="RuntimeSchemaAccessError";
    this.label=label;
    this.kind=kind;
  }
}

function schemaKeywords(sql){
  if(typeof sql!=="string")throw new TypeError("transactional state SQL must be text");
  // Ignore comments and quoted values, not quoted SQL identifiers.
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|(?:'(?:''|[^'])*')/gu," ");
}

export function checkPortableSchemaSql(sql){
  if(typeof sql!=="string")throw new TypeError("transactional state SQL must be text");
  if(!/\bALTER\b/iu.test(sql))return;
  const statements=schemaKeywords(sql).split(";");
  if(statements.some(statement=>
    /\bALTER\s+TABLE\s+(?:"(?:[^"]|"")*"|\x60[^\x60]*\x60|\[[^\]]*\]|\w+)\s+(?:RENAME\s+(?:TO|COLUMN)|DROP\s+COLUMN)\b/iu.test(statement)))
    throw new Error("transactional state: schema-rewriting ALTER is not portable; rebuild by create/copy/drop");
}

export function runtimeSchemaKind(sql){
  const statement=schemaKeywords(sql);
  if(/\b(?:CREATE|ALTER|DROP)\b/iu.test(statement))return "ddl";
  if(/\b(?:sqlite_master|sqlite_schema)\b/iu.test(statement))return "catalogue";
  if(/\bPRAGMA\b/iu.test(statement)
    &&!/^[\s;]*PRAGMA\s+user_version\s*;?\s*$/iu.test(statement))return "pragma";
  return null;
}

export function checkRuntimeSchemaSql(sql,{mode="install",guard="reject",label="World"}={}){
  if(mode!=="runtime")return;
  const kind=runtimeSchemaKind(sql);
  if(kind===null)return;
  if(guard==="reject")throw new RuntimeSchemaAccessError(label,kind);
  if(guard!=="report")throw new TypeError("FIBRE_RUNTIME_SCHEMA_GUARD must be report or reject");
  const key=label+"\0"+kind;
  if(REPORTED.has(key))return;
  REPORTED.add(key);
  console.warn(JSON.stringify({event:"world-runtime-schema-access",label,kind}));
}

export function runtimeSchemaGuardMode(defaultMode,override){
  const mode=override??globalThis.process?.env?.FIBRE_RUNTIME_SCHEMA_GUARD??defaultMode;
  if(!["report","reject"].includes(mode))throw new TypeError(
    "FIBRE_RUNTIME_SCHEMA_GUARD must be report or reject",
  );
  return mode;
}
