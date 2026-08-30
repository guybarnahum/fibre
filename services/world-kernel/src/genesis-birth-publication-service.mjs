function assertAuthority(authority) {
  if (authority === null || typeof authority !== "object" || typeof authority.publishBirth !== "function") {
    throw new TypeError("Genesis birth publication authority must expose publishBirth(bundle)");
  }
  return authority;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function attachCivilRegistration(bundle) {
  if (bundle === null || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new TypeError("Genesis birth publication bundle must be an object");
  }
  const registration = bundle.civilRegistration;
  if (registration === undefined || registration === null) return bundle;
  if (bundle.manifest === null || typeof bundle.manifest !== "object" || Array.isArray(bundle.manifest)) {
    throw new TypeError("Genesis birth publication bundle manifest is required");
  }
  const publication = bundle.manifest.publication;
  if (publication === null || typeof publication !== "object" || Array.isArray(publication)) {
    throw new TypeError("Genesis birth publication manifest.publication is required");
  }
  const existing = publication.civilRegistration;
  if (existing !== undefined && !sameJson(existing, registration)) {
    throw new TypeError("Genesis birth publication carries conflicting civil registration records");
  }
  return {
    ...bundle,
    manifest: {
      ...bundle.manifest,
      publication: {
        ...publication,
        civilRegistration: structuredClone(registration),
      },
    },
  };
}

export function createGenesisBirthPublicationService({ authority } = {}) {
  const target = assertAuthority(authority);
  return Object.freeze({
    async publishBirth(bundle) {
      return target.publishBirth(attachCivilRegistration(bundle));
    },
  });
}
