function shared(assertion) {
  if (!assertion || typeof assertion !== "object") return null;
  const { side: _side, rawRenderDigest: _rawRenderDigest, ...rest } = assertion;
  return JSON.stringify(rest);
}

async function verifySide(asset, side, fetchImpl) {
  const image = await fetchImpl(asset.url, { cache:"no-store" });
  if (!image.ok) return { verified:false, reason:`${side}_image_unavailable` };

  const response = await fetchImpl(`/api/fid/verify?side=${encodeURIComponent(side)}`, {
    method:"POST",
    headers:{ "Content-Type":"image/png", Accept:"application/json" },
    body:await image.arrayBuffer(),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) return { verified:false, reason:`${side}_verification_unavailable` };
  if (result.verified !== true || !result.assertion) {
    return { verified:false, reason:result.reason ?? `${side}_unverified` };
  }
  return result;
}

export async function verifyFibreFinCardAssets({ front, back, fetchImpl = globalThis.fetch } = {}) {
  if (!front?.url || !back?.url || typeof fetchImpl !== "function") {
    throw new TypeError("FIN card verification requires front/back assets and fetch()");
  }
  const [frontResult, backResult] = await Promise.all([
    verifySide(front, "front", fetchImpl),
    verifySide(back, "back", fetchImpl),
  ]);
  if (!frontResult.verified) return frontResult;
  if (!backResult.verified) return backResult;
  if (shared(frontResult.assertion) !== shared(backResult.assertion)) {
    return { verified:false, reason:"pair_mismatch" };
  }
  return Object.freeze({
    verified:true,
    assertion:frontResult.assertion,
    frontAssertion:frontResult.assertion,
    backAssertion:backResult.assertion,
  });
}
