import * as FileSystem from "expo-file-system/legacy";

import { Flashcard, Question, Subject, Summary } from "../types";

const STORAGE_VERSION = 3;
const LIBRARY_DIRECTORY = "notez-library";
const saveQueues = new Map<string, Promise<void>>();

export interface StoredLibrary {
  schemaVersion: number;
  updatedAt: string;
  subjects: Subject[];
  flashcards: Flashcard[];
  summaries: Summary[];
  questions: Question[];
}

function removeDemoData(stored: StoredLibrary) {
  const demoSubjectIds = new Set(["1", "2", "3", "4", "5"]);
  const demoFlashcardIds = new Set(["fc-1", "fc-2", "fc-3", "fc-4"]);

  return {
    ...stored,
    schemaVersion: STORAGE_VERSION,
    subjects: stored.subjects.filter((subject) => !demoSubjectIds.has(subject.id)),
    flashcards: stored.flashcards.filter((flashcard) => !demoFlashcardIds.has(flashcard.id)),
    summaries: stored.summaries ?? [],
    questions: stored.questions ?? [],
  };
}

function getLibraryFileUri(userKey: string) {
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("O diretório local do aplicativo não está disponível");
  }

  const safeUserKey = encodeURIComponent(userKey.toLowerCase().trim());
  return `${directory}${LIBRARY_DIRECTORY}/${safeUserKey}.json`;
}

async function ensureDirectoryExists() {
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error("O diretório local do aplicativo não está disponível");
  }

  const libraryDirectory = `${directory}${LIBRARY_DIRECTORY}`;
  const directoryInfo = await FileSystem.getInfoAsync(libraryDirectory);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(libraryDirectory, { intermediates: true });
  }
}

export async function loadLibrary(userKey: string, defaults: Omit<StoredLibrary, "updatedAt">) {
  const fileUri = getLibraryFileUri(userKey);

  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return { ...defaults, updatedAt: new Date().toISOString() };
    }

    const stored = JSON.parse(await FileSystem.readAsStringAsync(fileUri)) as StoredLibrary;
    if (![1, 2, STORAGE_VERSION].includes(stored.schemaVersion) || !Array.isArray(stored.subjects) || !Array.isArray(stored.flashcards)) {
      return { ...defaults, updatedAt: new Date().toISOString() };
    }

    return removeDemoData(stored);
  } catch (error) {
    console.warn("Falha ao carregar biblioteca offline", error);
    return { ...defaults, updatedAt: new Date().toISOString() };
  }
}

export async function saveLibrary(
  userKey: string,
  subjects: Subject[],
  flashcards: Flashcard[],
  summaries: Summary[],
  questions: Question[],
) {
  const data: StoredLibrary = {
    schemaVersion: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    subjects,
    flashcards,
    summaries,
    questions,
  };

  const previousSave = saveQueues.get(userKey) ?? Promise.resolve();
  const nextSave = previousSave
    .catch(() => undefined)
    .then(async () => {
      await ensureDirectoryExists();
      const fileUri = getLibraryFileUri(userKey);
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
    });

  saveQueues.set(userKey, nextSave);
  await nextSave;
}