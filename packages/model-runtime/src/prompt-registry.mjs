import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const PROMPT_NAME = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;

function promptName(value, label) {
  if (typeof value !== "string" || !PROMPT_NAME.test(value)) {
    throw new TypeError(`${label} must be a stable lowercase prompt name`);
  }
  return value;
}

function promptDirectory(value) {
  const url = value instanceof URL ? new URL(value.href) : new URL(value);
  if (!url.pathname.endsWith("/")) {
    throw new TypeError("prompt directory URL must end with /");
  }
  return url;
}

function readPrompt(url, label) {
  let text;
  try {
    text = readFileSync(url, "utf8");
  } catch (error) {
    throw new TypeError(`cannot read ${label}: ${error.message}`);
  }
  if (text.length === 0) throw new TypeError(`${label} must not be empty`);
  return text;
}

function digest(text) {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export function resolvePromptAsset({ directory, id, profile = null } = {}) {
  const root = promptDirectory(directory);
  const promptId = promptName(id, "prompt id");
  const baseAsset = `${promptId}.md`;
  const baseText = readPrompt(new URL(baseAsset, root), `prompt ${promptId}`);

  let profileId = null;
  let profileAsset = null;
  let profileText = null;
  let resolvedText = baseText;

  if (profile !== null) {
    profileId = promptName(profile, "prompt profile");
    profileAsset = `profiles/${profileId}/${baseAsset}`;
    profileText = readPrompt(
      new URL(profileAsset, root),
      `prompt profile ${profileId} for ${promptId}`,
    );
    resolvedText = `${baseText}\n\n${profileText}`;
  }

  return Object.freeze({
    id: promptId,
    profile: profileId,
    text: resolvedText,
    digest: digest(resolvedText),
    baseDigest: digest(baseText),
    profileDigest: profileText === null ? null : digest(profileText),
    asset: baseAsset,
    profileAsset,
  });
}
