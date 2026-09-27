import {
  GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
  canonicalVisualSpecificationFromPhysicalGenome,
} from "fibre/world-kernel/genesis-authority-contracts";

export function buildGenesisCanonicalVisualIdentity({
  threadId,
  sex,
  physicalGenome,
}={}){
  return Object.freeze({
    policyRef:GENESIS_CANONICAL_VISUAL_IDENTITY_POLICY,
    specification:canonicalVisualSpecificationFromPhysicalGenome({threadId,sex,physicalGenome}),
  });
}
