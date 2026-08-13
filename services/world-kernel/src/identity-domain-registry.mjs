// Pre-production Fibre supports one identity registry dialect. The base module
// remains only as a definition source while the current registry is composed;
// callers cannot select an older registry version.
export {
  IDENTITY_PROVENANCE_CLASSES,
  IDENTITY_AUTHORSHIP_KINDS,
  IDENTITY_VISIBILITIES,
  IDENTITY_ASSERTION_STATUSES,
  IDENTITY_BEHAVIORAL_STATUSES,
  IDENTITY_DOMAIN_REGISTRIES,
} from "./identity-domain-registry-base.mjs";

export {
  IDENTITY_DOMAIN_REGISTRY_V2 as IDENTITY_DOMAIN_REGISTRY,
  IDENTITY_DOMAIN_REGISTRY_V2_DIGEST as IDENTITY_DOMAIN_REGISTRY_DIGEST,
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION as IDENTITY_DOMAIN_REGISTRY_VERSION,
  identityDomainV2Definition as identityDomainDefinition,
} from "./identity-domain-registry-v2.mjs";

import { IDENTITY_DOMAIN_REGISTRY_V2 } from "./identity-domain-registry-v2.mjs";

export function listIdentityDomainDefinitions() {
  return Object.entries(IDENTITY_DOMAIN_REGISTRY_V2).map(([domainId, definition]) => ({
    domainId,
    ...definition,
  }));
}
