import { promptRequest } from "./cognition-prompts.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const JOURNAL_STYLES = Object.freeze(["classic", "notebook", "literary", "minimal"]);
const DEFAULT_JOURNAL_PRESENTATION = Object.freeze({
  title:"Journal",
  presentationStyle:"classic",
  aestheticNote:"Plain pages until a personal style is chosen.",
});
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
    ...promptRequest("journal.form",{threadId:thread.threadId}),
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

export function createThreadJournalBook({ storage, experienceStore } = {}) {
  requireMethod("experienceStore",experienceStore,"listThreadJournalEntries");
  const database=openWorldStateDatabase(storage,{storeName:"ThreadJournalBook"});
  function profileFor(threadId){
    assertId("journal threadId",threadId);
    const row=database.prepare(`
      SELECT title,presentation_style,aesthetic_note
      FROM thread_journal_profiles WHERE thread_id=?
    `).get(threadId);
    return row===undefined?null:normalizeProfile({
      title:row.title,
      presentationStyle:row.presentation_style,
      aestheticNote:row.aesthetic_note,
    },threadId);
  }

  return Object.freeze({
    key:journalKey,
    close(){database.close();},

    async getProfile(threadId){return profileFor(threadId);},

    async ensureProfile({thread,modelAdapter}){
      assertPlainObject("Thread",thread);
      assertId("Thread.threadId",thread.threadId);
      const existing=profileFor(thread.threadId);
      if(existing!==null)return existing;
      const chosen=await formThreadJournalProfile({thread,modelAdapter});
      database.prepare(`
        INSERT OR IGNORE INTO thread_journal_profiles(
          thread_id,title,presentation_style,aesthetic_note
        ) VALUES(?,?,?,?)
      `).run(thread.threadId,chosen.title,chosen.presentationStyle,chosen.aestheticNote);
      return profileFor(thread.threadId);
    },

    async read(threadId){
      const entries=experienceStore.listThreadJournalEntries(threadId);
      const profile=profileFor(threadId)
        ??(entries.length>0?normalizeProfile(DEFAULT_JOURNAL_PRESENTATION,threadId):null);
      if(profile===null)return null;
      const document=`${HEADER_PREFIX}${JSON.stringify(profile)}${HEADER_SUFFIX}\n\n# ${profile.title}`+
        entries.map((entry)=>`\n\n## ${displayTimestamp(entry.writtenAt)}\n\n${entry.entryText.trim()}\n`).join("");
      return Object.freeze({profile,document});
    },
  });
}
