import { openDB } from "idb";
import { sessionSchema, type Session } from "../schema/session";
import { createDefaultSession } from "../templates/defaultSession";

const DB_NAME = "stage";
const DB_VERSION = 1;
const SESSIONS_STORE = "sessions";
const DRAFTS_STORE = "drafts";
const PRESETS_STORE = "presets";
const LAST_OPENED_SESSION_KEY = "stage:lastOpenedSessionId";

async function openPatchbayDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        const store = database.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("name", "name");
      }

      if (!database.objectStoreNames.contains(DRAFTS_STORE)) {
        const store = database.createObjectStore(DRAFTS_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }

      if (!database.objectStoreNames.contains(PRESETS_STORE)) {
        database.createObjectStore(PRESETS_STORE, { keyPath: "id" });
      }
    },
  });
}

export async function restoreStartupSession(): Promise<Session> {
  const database = await openPatchbayDb();
  const lastOpenedSessionId = window.localStorage.getItem(LAST_OPENED_SESSION_KEY);

  if (lastOpenedSessionId) {
    const draft = await database.get(DRAFTS_STORE, lastOpenedSessionId);
    const parsedDraft = sessionSchema.safeParse(draft);

    if (parsedDraft.success) {
      return parsedDraft.data;
    }

    const savedSession = await database.get(SESSIONS_STORE, lastOpenedSessionId);
    const parsedSession = sessionSchema.safeParse(savedSession);

    if (parsedSession.success) {
      return parsedSession.data;
    }
  }

  const starter = createDefaultSession();
  await database.put(SESSIONS_STORE, starter);
  window.localStorage.setItem(LAST_OPENED_SESSION_KEY, starter.id);
  return starter;
}

export async function saveDraft(session: Session) {
  const database = await openPatchbayDb();
  const nextSession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };

  await database.put(DRAFTS_STORE, nextSession);
  window.localStorage.setItem(LAST_OPENED_SESSION_KEY, nextSession.id);
}
