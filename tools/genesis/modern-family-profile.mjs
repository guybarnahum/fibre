import { sampleFamilyAncestry } from "../../core/src/human-phenotype/index.mjs";

export function sampleModernFamilyProfile({ profiles, requestId }) {
  if (!Array.isArray(profiles) || profiles.length === 0) throw new TypeError("modern Genesis requires family profiles");
  if (typeof requestId !== "string" || requestId.trim() === "") throw new TypeError("modern Genesis family sampling requires requestId");

  const normalized = profiles.map((profile, index) => ({
    ...profile,
    id:profile?.id ?? `family-${index + 1}`,
    share:profile?.share ?? 1,
    maternalAncestry:profile?.physicalAncestry?.maternal,
    paternalAncestry:profile?.physicalAncestry?.paternal,
  }));
  if (new Set(normalized.map((profile) => profile.id)).size !== normalized.length) throw new TypeError("modern Genesis family profile ids must be unique");
  const sampled = sampleFamilyAncestry({ profiles:normalized, seed:`modern-genesis:${requestId}` });
  const profile = normalized.find((candidate) => candidate.id === sampled.profileId);
  if (!profile) throw new Error("sampled Genesis family profile is unavailable");

  const { maternalAncestry: _maternal, paternalAncestry: _paternal, ...material } = profile;
  return Object.freeze({
    ...material,
    physicalAncestry:Object.freeze({
      maternal:sampled.maternal.ancestry,
      paternal:sampled.paternal.ancestry,
    }),
  });
}
