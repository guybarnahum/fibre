import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const JOURNAL_STYLES = Object.freeze(["classic", "notebook", "literary", "minimal"]);
const HEADER_PREFIX = "<!-- fibre-thread-journal-v1\n";
const HEADER_SUFFIX = "\n-->";

function requireMethod(name, value, method) {
  if (value === null || typeof value !== "object" || typeof value[method] !== "function") {
    throw new TypeError(`${name}.${method} is required`);
  }
}

function journalKey(threadId) {
  assertId("journal threadId", threadId);
  return `journals/${threadId}/journal.md`;
}

function normalizeProfile(value, threadId) {
  assertPlainObject("journal profile", value);
  assertNonEmpty("journal profile.title", value.title);
  assertNonEmpty("journal profile.presentationStyle", value.presentationStyle);
  assertNonEmpty("journal profile.aestheticNote", value.aestheticNote);
  if (!JOURNAL_STYLES.includes(value.presentationStyle)) {
    throw new TypeError("journal profile presentationStyle is invalid");
  }
  return Object.freeze({
    threadId,
    title:value.title.trim(),
    presentationStyle:value.presentationStyle,
    aestheticNote:value.aestheticNote.trim(),
  });
}

function parseDocument(document, threadId) {
  if (typeof document !== "string" || !document.startsWith(HEADER_PREFIX)) return null;
  const end = document.indexOf(HEADER_SUFFIX, HEADER_PREFIX.length);
  if (end < 0) throw new TypeError("journal document header is incomplete");
  const profile = normalizeProfile(
    JSON.parse(document.slice(HEADER_PREFIX.length, end)),
    threadId,
  );
  return Object.freeze({ profile, document });
}

function displayTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace("T", " · ").replace(".000Z", "Z");
}

export async function formThreadJournalProfile({ thread, modelAdapter }) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  requireMethod("modelAdapter", modelAdapter, "invoke");
  const input = {
    thread:{
      threadId:thread.threadId,
      name:thread.identity?.name ?? null,
      selfDescription:thread.identity?.selfDescription ?? "",
      selfModel:thread.currentState?.selfModel ?? "",
      stableTendencies:structuredClone(thread.genome?.textualTraits ?? {}),
      culture:[...(thread.identity?.culture ?? [])],
    },
  };
  const invocation = await modelAdapter.invoke({
    systemPrompt:`You are one persistent Fibre Thread choosing the private form of your own journal.
Choose a title and a durable aesthetic that feel personally natural to this Thread rather than generic.
aestheticNote is free-form first-person taste: describe the feel of the pages, density, rhythm, ornament, restraint, or other qualities you want.
presentationStyle is only a rendering hint; the natural-language aestheticNote is the authoritative taste.
Do not describe the Thread from outside and do not imitate a demographic stereotype.`,
    input,
    responseSchema:{
      type:"object",
      additionalProperties:false,
      required:["title","presentationStyle","aestheticNote"],
      properties:{
        title:{ type:"string", minLength:1, maxLength:120 },
        presentationStyle:{ type:"string", enum:JOURNAL_STYLES },
        aestheticNote:{ type:"string", minLength:1, maxLength:500 },
      },
    },
    clientRequestId:`journal-profile_${sha256(canonicalJson(input))}`,
  });
  return normalizeProfile(invocation.output, thread.threadId);
}

export function createThreadJournalBook({ objectStore }) {
  requireMethod("objectStore", objectStore, "read");
  requireMethod("objectStore", objectStore, "write");

  return Object.freeze({
    key:journalKey,
    async read(threadId) {
      const document = await objectStore.read(journalKey(threadId));
      return document === null ? null : parseDocument(document, threadId);
    },
    async getProfile(threadId) {
      return (await this.read(threadId))?.profile ?? null;
    },
    async append({ threadId, profile, writtenAt, entryText }) {
      assertId("journal threadId", threadId);
      assertNonEmpty("journal writtenAt", writtenAt);
      assertNonEmpty("journal entryText", entryText);
      const existing = await this.read(threadId);
      const activeProfile = existing?.profile ?? normalizeProfile(profile, threadId);
      if (existing !== null && canonicalJson(activeProfile) !== canonicalJson(existing.profile)) {
        throw new TypeError("journal profile cannot silently change");
      }
      const entry = `## ${displayTimestamp(writtenAt)}\n\n${entryText.trim()}\n`;
      const document = existing === null
        ? `${HEADER_PREFIX}${JSON.stringify(activeProfile)}${HEADER_SUFFIX}\n\n# ${activeProfile.title}\n\n${entry}`
        : `${existing.document.trimEnd()}\n\n${entry}`;
      await objectStore.write(journalKey(threadId), document, {
        contentType:"text/markdown; charset=utf-8",
        threadId,
        presentationStyle:activeProfile.presentationStyle,
      });
      return Object.freeze({
        objectKey:journalKey(threadId),
        profile:activeProfile,
      });
    },
  });
}
