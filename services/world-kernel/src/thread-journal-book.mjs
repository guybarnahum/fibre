import { openWorldStateDatabase } from "./world-state-storage.mjs";
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

export function createThreadJournalBook({ storage, legacyReader = null } = {}) {
  if (legacyReader !== null && typeof legacyReader !== "function") {
    throw new TypeError("journal legacyReader must be a function or null");
  }
  const database = openWorldStateDatabase(storage, { storeName:"ThreadJournalBook" });
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS thread_journal_books (
        thread_id TEXT PRIMARY KEY,
        document TEXT NOT NULL,
        document_digest TEXT NOT NULL CHECK (document_digest LIKE 'sha256:%')
      ) STRICT;
    `);
  } catch (error) {
    database.close();
    throw error;
  }

  function stored(threadId) {
    const row = database.prepare(
      "SELECT document, document_digest FROM thread_journal_books WHERE thread_id=?",
    ).get(threadId);
    if (row === undefined) return null;
    if (row.document_digest !== `sha256:${sha256(row.document)}`) {
      throw new Error("Thread Journal document failed integrity verification");
    }
    const parsed = parseDocument(row.document, threadId);
    if (parsed === null) throw new Error("Thread Journal document is invalid");
    return parsed;
  }

  return Object.freeze({
    key:journalKey,
    close() { database.close(); },

    async read(threadId) {
      const key = journalKey(threadId);
      const existing = stored(threadId);
      if (existing !== null || legacyReader === null) return existing;

      // A one-time, read-only import preserves historical R2 books. New and
      // subsequent journal writes use only transactional World state.
      const legacy = await legacyReader(key);
      if (legacy === null) return null;
      if (parseDocument(legacy, threadId) === null) {
        throw new Error("legacy Thread Journal has no valid profile header");
      }
      database.prepare(`
        INSERT OR IGNORE INTO thread_journal_books(thread_id,document,document_digest)
        VALUES(?,?,?)
      `).run(threadId, legacy, `sha256:${sha256(legacy)}`);
      return stored(threadId);
    },

    async getProfile(threadId) {
      return (await this.read(threadId))?.profile ?? null;
    },

    async append({ threadId, profile, writtenAt, entryText }) {
      assertId("journal threadId", threadId);
      assertNonEmpty("journal writtenAt", writtenAt);
      assertNonEmpty("journal entryText", entryText);
      await this.read(threadId); // Import an existing book before changing it.
      const activeProfile = database.transaction(() => {
        const existing = stored(threadId);
        const selected = existing?.profile ?? normalizeProfile(profile, threadId);
        const entry = `## ${displayTimestamp(writtenAt)}\n\n${entryText.trim()}\n`;
        const document = existing === null
          ? `${HEADER_PREFIX}${JSON.stringify(selected)}${HEADER_SUFFIX}\n\n# ${selected.title}\n\n${entry}`
          : `${existing.document.trimEnd()}\n\n${entry}`;
        database.prepare(`
          INSERT INTO thread_journal_books(thread_id,document,document_digest)
          VALUES(?,?,?)
          ON CONFLICT(thread_id) DO UPDATE
            SET document=excluded.document,document_digest=excluded.document_digest
        `).run(threadId, document, `sha256:${sha256(document)}`);
        return selected;
      });
      return Object.freeze({
        objectKey:journalKey(threadId),
        profile:activeProfile,
      });
    },
  });
}
