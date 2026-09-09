export {
  FID_CREDENTIAL_RECORD_VERSION,
  FID_LIFECYCLE_STATUSES,
  fidRecordDigest,
  normalizeFidCivilIdentity,
  normalizeFidCredentialRecord,
  normalizeFidLifecycleStatus,
} from "./fid-card-domain.mjs";

export {
  FidActiveCredentialConflictError,
  FidCardRegistry,
  FidCredentialIntegrityError,
} from "./fid-card-registry.mjs";
