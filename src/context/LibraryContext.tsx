import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContext";
import { loadLibrary, saveLibrary } from "../services/libraryStorage";
import {
  cancelReviewReminder,
  scheduleReviewReminder,
} from "../services/reviewNotificationService";
import {
  Flashcard,
  FlashcardDifficulty,
  Question,
  Subject,
  SubjectIcon,
  Summary,
} from "../types";

interface CreateSubjectInput {
  title: string;
  subtitle: string;
  icon?: SubjectIcon;
}

interface CreateFlashcardInput {
  topicId: string;
  front: string;
  back: string;
  difficulty?: FlashcardDifficulty;
}

interface UpdateFlashcardInput {
  front: string;
  back: string;
}

interface CreateSummaryInput {
  topicId: string;
  title: string;
  content: string;
}

interface CreateQuestionInput {
  topicId: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

interface LibraryContextValue {
  subjects: Subject[];
  flashcards: Flashcard[];
  summaries: Summary[];
  questions: Question[];
  addSubject: (input: CreateSubjectInput) => void;
  deleteSubject: (subjectId: string) => void;
  addTopic: (subjectId: string, title: string) => string | null;
  addFlashcard: (input: CreateFlashcardInput) => void;
  updateFlashcard: (flashcardId: string, input: UpdateFlashcardInput) => void;
  deleteFlashcard: (flashcardId: string) => void;
  addSummary: (input: CreateSummaryInput) => void;
  deleteSummary: (summaryId: string) => void;
  addQuestion: (input: CreateQuestionInput) => void;
  deleteQuestion: (questionId: string) => void;
  markFlashcardReviewed: (flashcardId: string, difficulty: FlashcardDifficulty) => void;
  getFlashcardsByTopic: (topicId: string) => Flashcard[];
  getSummariesByTopic: (topicId: string) => Summary[];
  getQuestionsByTopic: (topicId: string) => Question[];
  getDueFlashcards: () => Flashcard[];
  refreshLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function pickIconOption(index: number) {
  const options = [
    { icon: "calculator" as const, color: "#2563EB", background: "#DBEAFE" },
    { icon: "atom" as const, color: "#7C3AED", background: "#EDE9FE" },
    { icon: "flask" as const, color: "#16A34A", background: "#DCFCE7" },
    { icon: "book" as const, color: "#B45309", background: "#FEF3C7" },
    { icon: "dna" as const, color: "#0D9488", background: "#CCFBF1" },
    { icon: "default" as const, color: "#64748B", background: "#F1F5F9" },
  ];

  return options[index % options.length];
}

const REVIEW_INTERVALS_MS: Record<FlashcardDifficulty, number> = {
  hard: 3 * 60 * 60 * 1000,
  medium: 2 * 24 * 60 * 60 * 1000,
  easy: 5 * 24 * 60 * 60 * 1000,
};

function getNextReviewAt(difficulty: FlashcardDifficulty) {
  return Date.now() + REVIEW_INTERVALS_MS[difficulty];
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const userKey = user?.email.trim().toLowerCase() ?? null;

  useEffect(() => {
    let isCurrent = true;

    if (isAuthLoading) {
      return () => {
        isCurrent = false;
      };
    }

    if (!userKey) {
      setSubjects([]);
      setFlashcards([]);
      setIsHydrated(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsHydrated(false);
    loadLibrary(userKey, {
      schemaVersion: 3,
      subjects: [],
      flashcards: [],
      summaries: [],
      questions: [],
    }).then((stored) => {
      if (!isCurrent) return;
      setSubjects(stored.subjects);
      setFlashcards(stored.flashcards);
      setSummaries(stored.summaries ?? []);
      setQuestions(stored.questions ?? []);
      setIsHydrated(true);
    });

    return () => {
      isCurrent = false;
    };
  }, [isAuthLoading, userKey]);

  const refreshLibrary = useCallback(async () => {
    if (!userKey) return;
    const stored = await loadLibrary(userKey, {
      schemaVersion: 3,
      subjects: [],
      flashcards: [],
      summaries: [],
      questions: [],
    });
    setSubjects(stored.subjects);
    setFlashcards(stored.flashcards);
    setSummaries(stored.summaries ?? []);
    setQuestions(stored.questions ?? []);
  }, [userKey]);

  useEffect(() => {
    if (!userKey || !isHydrated) return;
    saveLibrary(userKey, subjects, flashcards, summaries, questions).catch((error) => {
      console.warn("Falha ao salvar biblioteca offline", error);
    });
  }, [flashcards, isHydrated, questions, subjects, summaries, userKey]);

  const addSubject = useCallback((input: CreateSubjectInput) => {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return;
    }

    setSubjects((current) => {
      const iconOption = pickIconOption(current.length);

      const newSubject: Subject = {
        id: Date.now().toString(),
        title: trimmedTitle,
        subtitle: input.subtitle.trim() || "Nova matéria",
        icon: input.icon ?? iconOption.icon,
        iconColor: iconOption.color,
        iconBackground: iconOption.background,
        topics: [],
      };

      return [...current, newSubject];
    });
  }, []);

  const deleteSubject = useCallback((subjectId: string) => {
    const subject = subjects.find((item) => item.id === subjectId);
    if (!subject) return;

    const topicIds = new Set(subject.topics.map((topic) => topic.id));
    setSubjects((current) => current.filter((item) => item.id !== subjectId));
    setFlashcards((cards) => cards.filter((card) => !topicIds.has(card.topicId)));
    setSummaries((items) => items.filter((summary) => !topicIds.has(summary.topicId)));
    setQuestions((items) => items.filter((question) => !topicIds.has(question.topicId)));
  }, [subjects]);

  const addTopic = useCallback((subjectId: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return null;
    }

    const topicId = `${subjectId}-${Date.now()}`;

    setSubjects((current) =>
      current.map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              topics: [
                ...subject.topics,
                { id: topicId, title: trimmedTitle },
              ],
            }
          : subject,
      ),
    );

    return topicId;
  }, []);

  const addFlashcard = useCallback((input: CreateFlashcardInput) => {
    const front = input.front.trim();
    const back = input.back.trim();
    const difficulty = input.difficulty ?? "medium";
    if (!front || !back) {
      return;
    }

    const newFlashcard: Flashcard = {
      id: `fc-${Date.now()}`,
      topicId: input.topicId,
      front,
      back,
      reviewed: false,
      ok: difficulty !== "hard",
      reviewedCount: 0,
      lastReviewedAt: undefined,
      difficulty,
      nextReviewAt: Date.now(),
    };

    setFlashcards((current) => [...current, newFlashcard]);
  }, []);

  const updateFlashcard = useCallback((flashcardId: string, input: UpdateFlashcardInput) => {
    const front = input.front.trim();
    const back = input.back.trim();
    if (!front || !back) return;

    setFlashcards((current) => current.map((flashcard) =>
      flashcard.id === flashcardId ? { ...flashcard, front, back } : flashcard,
    ));
  }, []);

  const deleteFlashcard = useCallback((flashcardId: string) => {
    setFlashcards((current) => current.filter((flashcard) => flashcard.id !== flashcardId));
  }, []);

  const addSummary = useCallback((input: CreateSummaryInput) => {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title || !content) return;

    setSummaries((current) => [
      ...current,
      { id: `summary-${Date.now()}`, topicId: input.topicId, title, content, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const deleteSummary = useCallback((summaryId: string) => {
    setSummaries((current) => current.filter((summary) => summary.id !== summaryId));
  }, []);

  const addQuestion = useCallback((input: CreateQuestionInput) => {
    const prompt = input.prompt.trim();
    const options = input.options.map((option) => option.trim()).filter(Boolean);
    if (!prompt || options.length < 2 || input.correctOption < 0 || input.correctOption >= options.length) return;

    setQuestions((current) => [
      ...current,
      {
        id: `question-${Date.now()}`,
        topicId: input.topicId,
        prompt,
        options,
        correctOption: input.correctOption,
        explanation: input.explanation?.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const deleteQuestion = useCallback((questionId: string) => {
    setQuestions((current) => current.filter((question) => question.id !== questionId));
  }, []);

  const markFlashcardReviewed = useCallback(
    async (flashcardId: string, difficulty: FlashcardDifficulty) => {
      const currentCard = flashcards.find((flashcard) => flashcard.id === flashcardId);
      if (!currentCard) return;

      const nextReviewAt = getNextReviewAt(difficulty);
      await cancelReviewReminder(currentCard.reviewNotificationId);
      const subject = subjects.find((item) => item.topics.some((topic) => topic.id === currentCard.topicId));
      const topic = subject?.topics.find((item) => item.id === currentCard.topicId);
      const notificationId = await scheduleReviewReminder(
        subject?.title ?? "Sua biblioteca",
        topic?.title ?? "Flashcards",
        nextReviewAt,
      );

      setFlashcards((current) =>
        current.map((fc) =>
          fc.id === flashcardId
            ? {
                ...fc,
                reviewed: true,
                ok: difficulty !== "hard",
                difficulty,
                reviewedCount: (fc.reviewedCount ?? 0) + 1,
                lastReviewedAt: Date.now(),
                nextReviewAt,
                reviewNotificationId: notificationId,
              }
            : fc,
        ),
      );
    },
    [flashcards, subjects],
  );

  const getFlashcardsByTopic = useCallback(
    (topicId: string) =>
      flashcards.filter((flashcard) => flashcard.topicId === topicId),
    [flashcards],
  );

  const getSummariesByTopic = useCallback(
    (topicId: string) => summaries.filter((summary) => summary.topicId === topicId),
    [summaries],
  );

  const getQuestionsByTopic = useCallback(
    (topicId: string) => questions.filter((question) => question.topicId === topicId),
    [questions],
  );

  const getDueFlashcards = useCallback(() => {
    const now = Date.now();
    return flashcards
      .filter((flashcard) => flashcard.nextReviewAt === undefined || flashcard.nextReviewAt <= now)
      .sort((a, b) => {
        const priority: Record<FlashcardDifficulty, number> = { hard: 0, medium: 1, easy: 2 };
        const aPri = priority[a.difficulty];
        const bPri = priority[b.difficulty];
        if (aPri !== bPri) return aPri - bPri;
        return (b.lastReviewedAt ?? 0) - (a.lastReviewedAt ?? 0);
      });
  }, [flashcards]);

  const value = useMemo(
    () => ({
      subjects,
      flashcards,
      summaries,
      questions,
      addSubject,
      deleteSubject,
      addTopic,
      addFlashcard,
      updateFlashcard,
      deleteFlashcard,
      addSummary,
      deleteSummary,
      addQuestion,
      deleteQuestion,
      markFlashcardReviewed,
      getFlashcardsByTopic,
      getSummariesByTopic,
      getQuestionsByTopic,
      getDueFlashcards,
      refreshLibrary,
    }),
    [subjects, flashcards, summaries, questions, addSubject, deleteSubject, addTopic, addFlashcard, updateFlashcard, deleteFlashcard, addSummary, deleteSummary, addQuestion, deleteQuestion, markFlashcardReviewed, getFlashcardsByTopic, getSummariesByTopic, getQuestionsByTopic, getDueFlashcards, refreshLibrary],
  );

  if (isAuthLoading || (userKey !== null && !isHydrated)) {
    return null;
  }

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within LibraryProvider");
  }

  return context;
}
