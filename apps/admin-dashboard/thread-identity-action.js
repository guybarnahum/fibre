export function identityActionPayload(action,input,{operationKey}={}){
  if(!action||typeof action!=="object")throw new TypeError("identity action is required");
  if(typeof operationKey!=="string"||operationKey.trim()==="")throw new TypeError("identity operationKey is required");
  const command=action.command??"identity";
  if(!["repair_birth_geography","set_birth_country_code"].includes(action.id)){
    return {
      action:command,
      operationKey:operationKey.trim(),
      ...(action.fixed??{}),
      ...(input??{}),
    };
  }

  const countryCode=String(input?.countryCode??"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/u.test(countryCode))throw new TypeError("Country code must be a two-letter ISO code");
  const base=action.fixed?.birthPlace;
  if(!base||typeof base!=="object"||Array.isArray(base)){
    throw new TypeError("Birth-place repair is missing canonical geography");
  }
  return {
    action:command,
    operationKey:operationKey.trim(),
    ...(action.fixed??{}),
    birthPlace:{
      ...base,
      countryCode,
    },
  };
}
