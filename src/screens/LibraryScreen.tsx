import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CreateSubjectModal from "../components/CreateSubjectModal";
import CreateTopicModal from "../components/CreateTopicModal";
import SubjectCard from "../components/SubjectCard";
import Reveal from "../components/Reveal";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { LibraryStackParamList, Subject, Topic } from "../types";
import { ThemeColors } from "../theme/colors";

type Props = NativeStackScreenProps<LibraryStackParamList, "LibraryMain">;

type SortOption = "alphabetical" | "progress" | "due";
type FilterOption = "all" | "due" | "reviewed" | "notReviewed" | "noTopics" | "fewTopics" | "manyTopics";
type SubjectWithStats = Subject & {
  reviewedCount: number;
  dueCount: number;
  unreviewedCount: number;
  topicStats: Record<string, { total: number; due: number; reviewed: number; hard: number }>;
};

export default function LibraryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { subjects, flashcards, addSubject, deleteSubject, addTopic, refreshLibrary } = useLibrary();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [topicModalSubjectId, setTopicModalSubjectId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("due");
  const [alphabeticalDescending, setAlphabeticalDescending] = useState(false);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<SubjectWithStats>>(null);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setExpandedId(null);
      setSearchQuery("");
      setModalVisible(false);
      setTopicModalSubjectId(null);
      setShowFilters(false);
    }, []),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLibrary();
    } finally {
      setRefreshing(false);
    }
  }, [refreshLibrary]);

  // If another screen requested opening a specific topic, navigate to it
  useEffect(() => {
    const params: any = route.params as any;
    const openTopicId: string | undefined = params?.openTopicId;
    if (openTopicId) {
      // find subject and topic
      const subject = subjects.find((s) => s.topics.some((t) => t.id === openTopicId));
      const topic = subject?.topics.find((t) => t.id === openTopicId);
      if (subject && topic) {
        navigation.navigate("ContentDetail", {
          topicId: topic.id,
          subjectTitle: subject.title,
          subjectSubtitle: subject.subtitle,
          topicTitle: topic.title,
        });

        // clear params so we don't reopen repeatedly
        navigation.setParams({
          openTopicId: undefined,
          openSubjectTitle: undefined,
          openTopicTitle: undefined,
          openSubjectSubtitle: undefined,
        } as any);
      }
    }
  }, [route.params, subjects, navigation]);

  const subjectsWithStats = useMemo(() => {
    const now = Date.now();
    return subjects.map((subject) => {
      const subjectFlashcards = flashcards.filter((flashcard) =>
        subject.topics.some((topic) => topic.id === flashcard.topicId),
      );
      const reviewedCount = subjectFlashcards.filter((flashcard) => flashcard.reviewed).length;
      const dueCount = subjectFlashcards.filter(
        (flashcard) => flashcard.nextReviewAt === undefined || flashcard.nextReviewAt <= now,
      ).length;
      const unreviewedCount = subjectFlashcards.filter((flashcard) => !flashcard.reviewed).length;
      const progress = subjectFlashcards.length > 0 ? reviewedCount / subjectFlashcards.length : 0;

      return {
        ...subject,
        subjectFlashcards,
        reviewedCount,
        dueCount,
        unreviewedCount,
        progress,
        topicStats: Object.fromEntries(subject.topics.map((topic) => {
          const cards = subjectFlashcards.filter((card) => card.topicId === topic.id);
          return [topic.id, {
            total: cards.length,
            due: cards.filter((card) => card.nextReviewAt === undefined || card.nextReviewAt <= now).length,
            reviewed: cards.filter((card) => card.reviewed).length,
            hard: cards.filter((card) => card.difficulty === "hard").length,
          }];
        })),
      };
    });
  }, [subjects, flashcards]);

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let items = subjectsWithStats.filter((subject) => {
      if (!query) {
        return true;
      }

      return (
        subject.title.toLowerCase().includes(query) ||
        subject.subtitle.toLowerCase().includes(query) ||
        subject.topics.some((topic) => topic.title.toLowerCase().includes(query))
      );
    });

    items = items.filter((subject) => {
      if (filterOption === "all") return true;
      if (filterOption === "due") return subject.dueCount > 0;
      if (filterOption === "reviewed") return subject.subjectFlashcards.length > 0 && subject.reviewedCount === subject.subjectFlashcards.length;
      if (filterOption === "notReviewed") return subject.unreviewedCount > 0;
      if (filterOption === "noTopics") return subject.topics.length === 0;
      if (filterOption === "fewTopics") return subject.topics.length >= 1 && subject.topics.length <= 3;
      if (filterOption === "manyTopics") return subject.topics.length >= 4;
      return true;
    });

    const sorted = [...items];
    if (sortOption === "alphabetical") {
      sorted.sort((a, b) => (alphabeticalDescending ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title)));
    } else if (sortOption === "progress") {
      sorted.sort((a, b) => b.progress - a.progress);
    } else {
      sorted.sort((a, b) => b.dueCount - a.dueCount || a.title.localeCompare(b.title));
    }

    return sorted;
  }, [alphabeticalDescending, searchQuery, subjectsWithStats, filterOption, sortOption]);

  const subjectCountLabel =
    filteredSubjects.length === 1
      ? "1 matéria"
      : `${filteredSubjects.length} matérias`;

  function handleToggle(subjectId: string) {
    setExpandedId((current) => (current === subjectId ? null : subjectId));
  }

  function handleDeleteSubject(subject: Subject) {
    const removeSubject = () => {
      deleteSubject(subject.id);
      setExpandedId(null);
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Excluir ${subject.title}? A matéria e todos os seus conteúdos serão apagados.`)) removeSubject();
      return;
    }

    Alert.alert(
      `Excluir ${subject.title}?`,
      "A matéria e todos os seus conteúdos, flashcards, resumos e questões serão apagados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: removeSubject,
        },
      ],
    );
  }

  function handleTopicPress(subject: Subject, topic: Topic) {
    navigation.navigate("ContentDetail", {
      topicId: topic.id,
      subjectTitle: subject.title,
      subjectSubtitle: subject.subtitle,
      topicTitle: topic.title,
    });
  }

  function handleSubjectStudy(subject: Subject & { subjectFlashcards?: typeof flashcards }) {
    const topic = subject.topics.find((item) => {
      const cards = flashcards.filter((card) => card.topicId === item.id);
      return cards.some((card) => card.nextReviewAt === undefined || card.nextReviewAt <= Date.now() || !card.reviewed);
    }) ?? subject.topics[0];
    if (topic) handleTopicPress(subject, topic);
  }

  function handleCreateTopic(title: string) {
    if (!topicModalSubjectId) return;
    const subject = subjects.find((item) => item.id === topicModalSubjectId);
    const topicId = addTopic(topicModalSubjectId, title);
    setTopicModalSubjectId(null);
    if (!subject || !topicId) return;

    navigation.navigate("ContentDetail", {
      topicId,
      subjectTitle: subject.title,
      subjectSubtitle: subject.subtitle,
      topicTitle: title,
    });
  }

  function renderSubject({ item }: { item: SubjectWithStats }) {
    return (
      <SubjectCard
        subject={item}
        expanded={expandedId === item.id}
        onToggle={() => handleToggle(item.id)}
        onTopicPress={(topic) => handleTopicPress(item, topic)}
        onAddTopic={() => setTopicModalSubjectId(item.id)}
        onDelete={() => handleDeleteSubject(item)}
        onStudy={() => handleSubjectStudy(item)}
        reviewedCount={item.reviewedCount}
        dueCount={item.dueCount}
        unreviewedCount={item.unreviewedCount}
        topicStats={item.topicStats}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="library" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Biblioteca</Text>
            <Text style={styles.count}>{subjectCountLabel}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.iconButton,
              showFilters && styles.iconButtonActive,
            ]}
            onPress={() => setShowFilters((current) => !current)}
            hitSlop={8}
          >
            <Ionicons
              name="filter-outline"
              size={22}
              color={showFilters ? colors.white : colors.text}
            />
          </Pressable>
        </View>
      </View>

      {showFilters && (
        <View style={styles.filterRow}>
          {([
          { key: "all", label: "Todos" },
          { key: "due", label: "Agendados" },
          { key: "reviewed", label: "Revisados" },
          { key: "notReviewed", label: "Não revisados" },
          { key: "noTopics", label: "Sem tópicos" },
          { key: "fewTopics", label: "1–3 tópicos" },
          { key: "manyTopics", label: "4+ tópicos" },
        ] as const).map((option) => (
          <Pressable
            key={option.key}
            style={[
              styles.filterButton,
              filterOption === option.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilterOption(option.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterOption === option.key && styles.filterButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar matérias..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Ordenar por</Text>
        {([
          { key: "due", label: "Agendados" },
          { key: "progress", label: "Progresso" },
          { key: "alphabetical", label: "A-Z" },
        ] as const).map((option) => (
          <Pressable
            key={option.key}
            style={[
              styles.sortButton,
              sortOption === option.key && styles.sortButtonActive,
            ]}
            onPress={() => {
              if (option.key === "alphabetical" && sortOption === "alphabetical") {
                setAlphabeticalDescending((current) => !current);
              } else {
                setSortOption(option.key);
                if (option.key !== "alphabetical") setAlphabeticalDescending(false);
              }
            }}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOption === option.key && styles.sortButtonTextActive,
              ]}
            >
              {option.key === "alphabetical" && sortOption === "alphabetical" ? (alphabeticalDescending ? "Z-A" : "A-Z") : option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Reveal style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={filteredSubjects}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderSubject}
        numColumns={1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma matéria encontrada</Text>
        }
      />
      </Reveal>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <CreateSubjectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={(title, subtitle, icon) => addSubject({ title, subtitle, icon })}
      />
      <CreateTopicModal
        visible={topicModalSubjectId !== null}
        onClose={() => setTopicModalSubjectId(null)}
        onCreate={handleCreateTopic}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  count: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 8,
  },
  sortButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  gridItem: {
    flex: 1,
    minWidth: "48%",
    maxWidth: "48%",
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 40,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
