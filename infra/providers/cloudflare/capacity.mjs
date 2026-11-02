import {InfraCapacityExhaustedError} from "../../infra-driver.mjs";

export function cloudflareCapacityError(error,capability){
  if(error instanceof InfraCapacityExhaustedError)return error;
  const message=String(error?.message??error);
  const d1=capability==="catalog"&&(Number(error?.code)===7500
    ||message.includes("exceeded D1's free tier daily row write limit"));
  const durable=capability==="state"
    &&/\bdurable objects?\b/iu.test(message)
    &&/\b(?:free[\s-]*(?:tier|plan)|quota)\b/iu.test(message)
    &&/\b(?:exceeded?|limit|quota)\b/iu.test(message)
    &&/\brows?\s+(?:read|written|write)\b|\b(?:read|write)\s+rows?\b/iu.test(message);
  return d1||durable?new InfraCapacityExhaustedError(capability,{cause:error}):error;
}
