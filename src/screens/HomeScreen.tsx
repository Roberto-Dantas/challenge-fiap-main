import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import SubjectStatsModal from "../components/SubjectStatsModal";
import ScanTextButton from "../components/ScanTextButton";
import Reveal from "../components/Reveal";
import { AnimatedMotiView } from "../components/AnimatedMotiView";

import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { RootTabParamList } from "../types";
import { ThemeColors } from "../theme/colors";
import { getSubjectIcon } from "../utils/icons";
import { getCurrentStreak, getTodayReviewCount } from "../utils/studyMetrics";

const actionItems = [
  { key: "quiz", title: "Quiz", icon: "school-outline" },
  { key: "resumos", title: "Resumos", icon: "document-text-outline" },
] as const;

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { subjects, flashcards, getDueFlashcards, getFlashcardsByTopic, getReviewHistory, refreshLibrary } = useLibrary();
  const { colors, theme, setTheme, dailyGoal } = useSettings();
  const styles = useMemo(() => useMemoStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showDueModal, setShowDueModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanRequest, setScanRequest] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setSelectedSubject(null);
      setShowDueModal(false);
      setShowPerformanceModal(false);
      setScannedText(null);
      setSearchQuery("");
    }, []),
  );
  const [scannedText, setScannedText] = useState<string | null>(null);
  const mode = theme;
  const toggleTheme = () => setTheme(mode === "light" ? "dark" : "light");

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLibrary();
    } finally {
      setRefreshing(false);
    }
  }, [refreshLibrary]);

  const allDueFlashcards = useMemo(() => getDueFlashcards(), [getDueFlashcards]);
  const dueFlashcards = useMemo(() => allDueFlashcards.slice(0, 3), [allDueFlashcards]);
  const reviewHistory = getReviewHistory();
  const reviewedTodayCount = useMemo(
    () => getTodayReviewCount(reviewHistory),
    [reviewHistory],
  );
  const notReviewedCount = useMemo(
    () => flashcards.filter((card) => !card.reviewed).length,
    [flashcards],
  );
  
  const streak = useMemo(() => getCurrentStreak(reviewHistory), [reviewHistory]);
  const dailyGoalProgress = Math.min(reviewedTodayCount, dailyGoal);
  const dailyGoalPercent = Math.round((dailyGoalProgress / dailyGoal) * 100);

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return subjects;
    }

    return subjects.filter(
      (subject) =>
        subject.title.toLowerCase().includes(query) ||
        subject.subtitle.toLowerCase().includes(query) ||
        subject.topics.some((topic) => topic.title.toLowerCase().includes(query)),
    );
  }, [subjects, searchQuery]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const results: SearchResult[] = [];
    subjects.forEach((subject) => {
      if (subject.title.toLowerCase().includes(query) || subject.subtitle.toLowerCase().includes(query)) {
        results.push({
          id: `subject-${subject.id}`,
          title: subject.title,
          subtitle: "Matéria na Biblioteca",
          icon: subject.icon === "default" ? "folder-open-outline" : "book-outline",
          onPress: () => navigation.navigate("Biblioteca"),
        });
      }
      subject.topics.forEach((topic) => {
        if (!topic.title.toLowerCase().includes(query)) return;
        results.push({
          id: `topic-${topic.id}`,
          title: topic.title,
          subtitle: subject.title,
          icon: "document-text-outline",
          onPress: () => navigation.navigate("Biblioteca" as any, { screen: "LibraryMain", params: { openTopicId: topic.id, openSubjectTitle: subject.title, openSubjectSubtitle: subject.subtitle, openTopicTitle: topic.title } }),
        });
      });
    });

    const actionMatches = (terms: string[]) => terms.some((term) => term.includes(query) || query.includes(term));
    if (actionMatches(["revisão", "revisar", "agendado", "cards"])) {
      results.push({ id: "action-review", title: "Revisão de hoje", subtitle: `${allDueFlashcards.length} cards agendados`, icon: "flash-outline", onPress: () => allDueFlashcards[0] ? navigation.navigate("Biblioteca" as any, { screen: "FlashcardStudy", params: { topicId: allDueFlashcards[0].topicId, subjectTitle: subjects.find((subject) => subject.topics.some((topic) => topic.id === allDueFlashcards[0].topicId))?.title ?? "", topicTitle: subjects.flatMap((subject) => subject.topics).find((topic) => topic.id === allDueFlashcards[0].topicId)?.title ?? "", reviewMode: "due" } }) : setShowDueModal(true) });
    }
    if (actionMatches(["escanear", "foto", "ocr", "imagem"])) {
      results.push({ id: "action-scan", title: "Escanear texto", subtitle: "Criar cards com a câmera", icon: "image-outline", onPress: () => setScanRequest((value) => value + 1) });
    }
    if (actionMatches(["novo", "criar", "card", "flashcard"])) {
      results.push({ id: "action-new", title: "Novo card", subtitle: "Criar manualmente na Biblioteca", icon: "add-circle-outline", onPress: () => navigation.navigate("Biblioteca") });
    }
    if (actionMatches(["estatística", "desempenho", "progresso"])) {
      results.push({ id: "action-stats", title: "Estatísticas", subtitle: "Ver seu desempenho", icon: "stats-chart-outline", onPress: () => navigation.navigate("Estatísticas") });
    }
    return results.slice(0, 8);
  }, [allDueFlashcards, navigation, searchQuery, subjects]);

  const dueModalItems = useMemo(() => getDueFlashcards().slice(0, 6), [getDueFlashcards]);

  const subjectCards = useMemo(
    () =>
      filteredSubjects.slice(0, 3).map((subject) => {
        const subjectFlashcards = flashcards.filter((fc) =>
          subject.topics.some((t) => t.id === fc.topicId),
        );
        const totalFlashcards = subjectFlashcards.length;
        const reviewedFlashcards = subjectFlashcards.filter((f) => f.reviewed).length;

        return {
          ...subject,
          progress: totalFlashcards > 0 ? Math.round((reviewedFlashcards / totalFlashcards) * 100) : 0,
          topicCountLabel:
            subject.topics.length === 1 ? "1 tópico" : `${subject.topics.length} tópicos`,
        };
      }),
    [filteredSubjects, flashcards],
  );

  const subjectPerformance = useMemo(
    () =>
      subjects.map((subject) => {
        const subjectFlashcards = flashcards.filter((fc) =>
          subject.topics.some((t) => t.id === fc.topicId),
        );
        const totalFlashcards = subjectFlashcards.length;
        const reviewedFlashcards = subjectFlashcards.filter((f) => f.reviewed).length;
        const dueCount = subjectFlashcards.filter(
          (fc) => fc.nextReviewAt === undefined || fc.nextReviewAt <= Date.now(),
        ).length;

        return {
          ...subject,
          totalFlashcards,
          reviewedFlashcards,
          dueCount,
          progress: totalFlashcards > 0 ? Math.round((reviewedFlashcards / totalFlashcards) * 100) : 0,
        };
      }),
    [subjects, flashcards],
  );

  const recentTopics = useMemo(() => {
    const topicsWithStudy = subjects
      .flatMap((subject) =>
        subject.topics.map((topic) => {
          const topicFlashcards = flashcards.filter((card) => card.topicId === topic.id);
          const lastReviewed = topicFlashcards.reduce((acc, cur) => {
            if (!cur.lastReviewedAt) return acc;
            return Math.max(acc, cur.lastReviewedAt);
          }, 0 as number);

          return { subject, topic, lastReviewed };
        }),
      )
      .filter(({ lastReviewed }) => lastReviewed > 0)
      .sort((a, b) => b.lastReviewed - a.lastReviewed);

    if (topicsWithStudy.length > 0) {
      return topicsWithStudy.slice(0, 3).map(({ subject, topic }) => ({ subject, topic }));
    }

    return [];
  }, [subjects, flashcards]);

  function handleViewAll() {
    setShowDueModal(true);
  }

  function handleViewAllPerformance() {
    setShowPerformanceModal(true);
  }

  function renderSubjectCard({ item }: { item: (typeof subjectCards)[number] }) {
    return (
      <Pressable
        style={[styles.subjectCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => setSelectedSubject(item.id)}
      >
        <View style={[styles.subjectIcon, { backgroundColor: item.iconBackground }]}>
          {getSubjectIcon(item.icon, 22, item.iconColor)}
        </View>
        <Text style={[styles.subjectTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.subjectSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
        <View style={styles.subjectFooter}>
          <Text style={[styles.subjectProgress, { color: colors.primary }]}>{item.progress}% completo</Text>
          <Text style={[styles.subjectTopics, { color: colors.textSecondary }]}>{item.topicCountLabel}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}> 
      <Reveal style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.brand, { color: colors.textMuted }]}>NOTEZ</Text>
            <Text style={[styles.greeting, { color: colors.text }]}>Olá, Estudante 👋</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              style={[styles.themeButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleRefresh}
              hitSlop={8}
              accessibilityLabel="Atualizar página"
            >
              {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />}
            </Pressable>
            <Pressable
              style={[styles.themeButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={toggleTheme}
              hitSlop={8}
              accessibilityLabel="Alternar tema"
            >
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={colors.text} />
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.white }]}>M</Text>
            </View>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar materiais, tópicos..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {searchQuery.trim() && (
          <View style={[styles.searchResults, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {searchResults.length > 0 ? searchResults.map((result) => (
              <Pressable key={result.id} style={styles.searchResultRow} onPress={() => { setSearchQuery(""); result.onPress(); }}>
                <View style={[styles.searchResultIcon, { backgroundColor: colors.primary + "18" }]}><Ionicons name={result.icon} size={17} color={colors.primary} /></View>
                <View style={styles.searchResultBody}><Text style={[styles.searchResultTitle, { color: colors.text }]}>{result.title}</Text><Text style={[styles.searchResultSubtitle, { color: colors.textSecondary }]}>{result.subtitle}</Text></View>
                <Ionicons name="arrow-up-outline" size={16} color={colors.textMuted} />
              </Pressable>
            )) : <Text style={[styles.searchEmpty, { color: colors.textSecondary }]}>Nenhum material, tópico ou função encontrado.</Text>}
          </View>
        )}

        {subjects.length === 0 && (
          <View style={[styles.onboardingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.onboardingIcon, { backgroundColor: colors.primary + "18" }]}><Ionicons name="library-outline" size={24} color={colors.primary} /></View>
            <Text style={[styles.onboardingTitle, { color: colors.text }]}>Comece criando sua primeira matéria</Text>
            <Text style={[styles.onboardingText, { color: colors.textSecondary }]}>Organize seus conteúdos, crie tópicos e transforme suas anotações em cards de estudo.</Text>
            <Pressable style={[styles.onboardingButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate("Biblioteca")}>
              <Ionicons name="add" size={17} color={colors.white} />
              <Text style={[styles.onboardingButtonText, { color: colors.white }]}>Adicionar matéria</Text>
            </Pressable>
          </View>
        )}

        {subjects.length > 0 && flashcards.length === 0 && (
          <View style={[styles.onboardingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={[styles.onboardingIcon, { backgroundColor: colors.primary + "18" }]}><Ionicons name="layers-outline" size={24} color={colors.primary} /></View>
            <Text style={[styles.onboardingTitle, { color: colors.text }]}>Sua biblioteca está pronta</Text>
            <Text style={[styles.onboardingText, { color: colors.textSecondary }]}>Agora adicione um tópico e crie seu primeiro flashcard para começar a estudar.</Text>
            <Pressable style={[styles.onboardingButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate("Biblioteca")}>
              <Ionicons name="arrow-forward" size={17} color={colors.white} />
              <Text style={[styles.onboardingButtonText, { color: colors.white }]}>Abrir Biblioteca</Text>
            </Pressable>
          </View>
        )}

        <AnimatedMotiView
          style={[styles.streakCard, { backgroundColor: colors.primary, borderColor: colors.primaryDark }]}
          from={{ scale: 0.97, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 150 }}
        >
          <AnimatedMotiView
            from={{ opacity: 0.12, scale: 0.92 }}
            animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.92, 1.04, 0.92] }}
            transition={{ type: "timing", duration: 2200, loop: true }}
            style={[styles.streakGlow, { backgroundColor: colors.primaryLight }]}
          />
          <View style={styles.streakOrbOne} />
          <View style={styles.streakOrbTwo} />
          <Text style={[styles.streakEyebrow, { color: colors.white }]}>OFENSIVA ATUAL</Text>
          <View style={styles.streakHeadline}>
            <AnimatedMotiView from={{ scale: 1 }} animate={{ scale: [1, 1.16, 1] }} transition={{ type: "timing", duration: 1400, loop: true }}>
              <Text style={[styles.streakBigNumber, { color: colors.white }]}>{streak}</Text>
            </AnimatedMotiView>
            <Text style={[styles.streakBigLabel, { color: colors.white }]}>dia{streak !== 1 ? "s" : ""} 🔥</Text>
          </View>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalLabel, { color: colors.white }]}>Meta diária</Text>
            <Text style={[styles.goalCount, { color: colors.white }]}>{dailyGoalProgress} / {dailyGoal} cards</Text>
          </View>
          <View style={[styles.dailyGoalBarBg, { backgroundColor: "rgba(255,255,255,0.24)" }]}>
            <AnimatedMotiView animate={{ width: `${dailyGoalPercent}%` }} transition={{ type: "spring", damping: 16, stiffness: 130 }} style={[styles.dailyGoalBarFill, { backgroundColor: colors.white }]} />
          </View>
        </AnimatedMotiView>

        <View style={[styles.statusRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}> 
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Revisados</Text>
            <Text style={[styles.statusValue, { color: colors.primary }]}>{reviewedTodayCount}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Pendentes</Text>
            <Text style={[styles.statusValue, { color: colors.danger || "#EF4444" }]}>{notReviewedCount}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Agendados</Text>
            <Text style={[styles.statusValue, { color: colors.primary }]}>{allDueFlashcards.length}</Text>
          </View>
        </View>

        <Text style={[styles.quickSectionLabel, { color: colors.textMuted }]}>AÇÕES RÁPIDAS</Text>
        <View style={styles.quickActionsRow}>
          <View style={[styles.quickAction, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <ScanTextButton iconOnly openRequest={scanRequest} scannerTitle="Escanear texto" variant="compact" onTextExtracted={(text) => setScannedText(text)} />
            <Text style={[styles.quickActionTitle, { color: colors.text }]}>Escanear foto</Text>
            <Text style={[styles.quickActionSubtitle, { color: colors.textSecondary }]}>Criar cards via câmera</Text>
          </View>
          <Pressable style={[styles.quickAction, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={() => navigation.navigate("Biblioteca")}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primary }]}><Ionicons name="add" size={21} color={colors.white} /></View>
            <Text style={[styles.quickActionTitle, { color: colors.text }]}>Novo card</Text>
            <Text style={[styles.quickActionSubtitle, { color: colors.textSecondary }]}>Criar manualmente</Text>
          </Pressable>
        </View>

        {scannedText && (
          <View style={[styles.scanResultCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.scanResultHeader}>
              <Text style={[styles.scanResultTitle, { color: colors.text }]}>Texto reconhecido</Text>
              <Pressable onPress={() => setScannedText(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.scanResultText, { color: colors.textSecondary }]} numberOfLines={4}>{scannedText}</Text>
            <Pressable style={[styles.scanResultAction, { borderColor: colors.primary }]} onPress={() => navigation.navigate("Biblioteca")}>
              <Ionicons name="albums-outline" size={16} color={colors.primary} />
              <Text style={[styles.scanResultActionText, { color: colors.primary }]}>Usar na Biblioteca</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Revisão agendada</Text>
            <Text style={styles.sectionSubtitle}>Os cards difíceis e médios aparecem primeiro</Text>
          </View>
          <Pressable onPress={handleViewAll}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </Pressable>
        </View>

        {dueFlashcards.length > 0 ? (
          <FlatList
            data={dueFlashcards}
            horizontal
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => {
              const subject = subjects.find((subj) => subj.topics.some((topic) => topic.id === item.topicId));
              return (
                <Pressable
                  style={[styles.dueCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => {
                    const topicTitle = subject?.topics.find((t) => t.id === item.topicId)?.title ?? "";

                    navigation.navigate("Biblioteca" as any, {
                      screen: "FlashcardStudy",
                      params: {
                        topicId: item.topicId,
                        subjectTitle: subject?.title ?? "",
                        topicTitle,
                        startIndex: 0,
                        flashcardId: item.id,
                      },
                    });
                  }}
                >
                  <Text style={[styles.dueCardTitle, { color: colors.text }]} numberOfLines={2}>{item.front}</Text>
                  <View style={styles.dueMetaRow}>
                    <Text style={[styles.dueTag, item.difficulty === "hard" ? styles.difficultyHard : item.difficulty === "medium" ? styles.difficultyMedium : styles.difficultyEasy]}>
                      {item.difficulty === "hard" ? "Difícil" : item.difficulty === "medium" ? "Médio" : "Fácil"}
                    </Text>
                    <Text style={[styles.dueWhen, { color: colors.textSecondary }]}>Agora</Text>
                  </View>
                </Pressable>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectList}
          />
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}> 
            <Text style={[styles.emptyText, { color: colors.text }]}>Nenhum flashcard agendado para agora.</Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Continue estudando suas matérias para agendar novos cards.</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Desempenho geral</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredSubjects.length} matérias disponíveis
            </Text>
          </View>
          <Pressable onPress={handleViewAllPerformance}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </Pressable>
        </View>

        <FlatList
          data={subjectCards}
          horizontal
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderSubjectCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectList}
        />

        <SubjectStatsModal subjectId={selectedSubject} visible={!!selectedSubject} onClose={() => setSelectedSubject(null)} />

        <View style={styles.sectionHeader}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Estudado recentemente</Text>
        </View>

        {recentTopics.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Nenhum tópico estudado ainda.</Text>
        ) : recentTopics.map(({ subject, topic }, topicIndex) => (
          <Pressable
            key={`${topic.id}-${topicIndex}`}
            style={[styles.recentCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() =>
              navigation.navigate("Biblioteca" as any, {
                screen: "LibraryMain",
                params: {
                  openTopicId: topic.id,
                  openSubjectTitle: subject.title,
                  openSubjectSubtitle: subject.subtitle,
                  openTopicTitle: topic.title,
                },
              })
            }
          >
            <View style={[styles.recentIcon, { backgroundColor: subject.iconBackground }]}>
              {getSubjectIcon(subject.icon, 20, subject.iconColor)}
            </View>
            <View style={styles.recentInfo}>
              <Text style={[styles.recentTopic, { color: colors.text }]}>{topic.title}</Text>
              <Text style={[styles.recentSubject, { color: colors.textSecondary }]}>{subject.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
        <Modal visible={showDueModal} transparent animationType="slide" onRequestClose={() => setShowDueModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}> 
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Revisões agendadas</Text>
                <Pressable onPress={() => setShowDueModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {dueModalItems.length === 0 ? (
                <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>Nenhum flashcard agendado no momento.</Text>
              ) : (
                dueModalItems.map((item, itemIndex) => {
                  const subject = subjects.find((subj) => subj.topics.some((topic) => topic.id === item.topicId));
                  const topicTitle = subject?.topics.find((t) => t.id === item.topicId)?.title ?? "";
                  return (
                    <Pressable
                      key={`${item.id}-${itemIndex}`}
                      style={[styles.modalItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => {
                        setShowDueModal(false);
                        navigation.navigate("Biblioteca" as any, {
                          screen: "FlashcardStudy",
                          params: {
                            topicId: item.topicId,
                            subjectTitle: subject?.title ?? "",
                            topicTitle,
                            startIndex: 0,
                            flashcardId: item.id,
                          },
                        });
                      }}
                    >
                      <View style={styles.modalItemHeader}>
                        <Text style={[styles.modalItemTitle, { color: colors.text }]} numberOfLines={1}>{topicTitle}</Text>
                        <Text style={[styles.modalItemBadge, item.difficulty === "hard" ? styles.difficultyHard : item.difficulty === "medium" ? styles.difficultyMedium : styles.difficultyEasy]}>
                          {item.difficulty === "hard" ? "Difícil" : item.difficulty === "medium" ? "Médio" : "Fácil"}
                        </Text>
                      </View>
                      <Text style={[styles.modalItemText, { color: colors.textSecondary }]} numberOfLines={2}>{item.front}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={showPerformanceModal} transparent animationType="slide" onRequestClose={() => setShowPerformanceModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}> 
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Desempenho por matéria</Text>
                <Pressable onPress={() => setShowPerformanceModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {subjectPerformance.map((subject, subjectIndex) => (
                <View key={`${subject.id}-${subjectIndex}`} style={[styles.performanceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                  <View style={styles.performanceHeader}>
                    <Text style={[styles.modalItemTitle, { color: colors.text }]}>{subject.title}</Text>
                    <Text style={[styles.performanceProgress, { color: colors.primary }]}>{subject.progress}%</Text>
                  </View>
                  <Text style={[styles.modalItemText, { color: colors.textSecondary }]}>{subject.subtitle}</Text>
                  <View style={styles.performanceStats}>
                    <Text style={[styles.performanceStat, { color: colors.text }]}>{subject.reviewedFlashcards}/{subject.totalFlashcards} revisados</Text>
                    <Text style={[styles.performanceStat, { color: colors.text }]}>{subject.dueCount} agendados</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Modal>
      </ScrollView>
      </Reveal>
    </View>
  );
}

const useMemoStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    topActions: {
      flexDirection: "row",
      gap: 8,
    },
    themeButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    brand: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 2,
      marginBottom: 4,
    },
    greeting: {
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 0,
    },
    greetingSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    avatar: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
    avatarText: { fontSize: 15, fontWeight: "900" },
    searchResults: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
    searchResultRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
    searchResultIcon: { alignItems: "center", borderRadius: 9, height: 32, justifyContent: "center", width: 32 },
    searchResultBody: { flex: 1 },
    searchResultTitle: { fontSize: 13, fontWeight: "800" },
    searchResultSubtitle: { fontSize: 11, marginTop: 2 },
    searchEmpty: { fontSize: 13, padding: 16, textAlign: "center" },
    onboardingCard: { borderRadius: 20, borderWidth: 1, marginBottom: 16, padding: 18 },
    onboardingIcon: { alignItems: "center", borderRadius: 12, height: 44, justifyContent: "center", marginBottom: 12, width: 44 },
    onboardingTitle: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
    onboardingText: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
    onboardingButton: { alignItems: "center", alignSelf: "flex-start", borderRadius: 11, flexDirection: "row", gap: 6, paddingHorizontal: 13, paddingVertical: 10 },
    onboardingButtonText: { fontSize: 13, fontWeight: "800" },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    scanSection: {
      marginBottom: 20,
    },
    scanResultCard: {
      marginTop: 12,
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
    },
    scanResultHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    scanResultTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    scanResultText: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 14,
    },
    scanResultAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
    },
    scanResultActionText: {
      fontSize: 13,
      fontWeight: "700",
    },
    streakCard: {
      minHeight: 140,
      overflow: "hidden",
      position: "relative",
      borderRadius: 20,
      borderWidth: 1,
      padding: 20,
      marginBottom: 16,
      backgroundColor: colors.primary,
    },
    streakOrbOne: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 70, height: 140, position: "absolute", right: -40, top: -62, width: 140 },
    streakOrbTwo: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 52, bottom: -42, height: 104, position: "absolute", right: 18, width: 104 },
    streakGlow: { borderRadius: 140, height: 220, position: "absolute", right: -62, top: -46, width: 220 },
    streakEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6, opacity: 0.8 },
    streakHeadline: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 12 },
    streakBigNumber: { fontSize: 42, fontWeight: "900", lineHeight: 45 },
    streakBigLabel: { fontSize: 17, fontWeight: "700" },
    goalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    goalLabel: { fontSize: 11, fontWeight: "600" },
    goalCount: { fontSize: 12, fontWeight: "800" },
    streakRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    streakItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 10,
    },
    streakIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    streakInfo: {
      flex: 1,
    },
    streakLabel: {
      fontSize: 12,
      marginBottom: 2,
    },
    streakValue: {
      fontSize: 16,
      fontWeight: "800",
    },
    streakDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
    dailyGoalBarContainer: {
      marginTop: 4,
    },
    dailyGoalBarBg: {
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      overflow: "hidden",
    },
    dailyGoalBarFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    quickSectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10, marginTop: 2 },
    quickActionsRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
    quickAction: { borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 104, padding: 12 },
    quickActionIcon: { alignItems: "center", borderRadius: 10, height: 32, justifyContent: "center", marginBottom: 8, width: 32 },
    quickActionTitle: { fontSize: 13, fontWeight: "800", marginBottom: 3 },
    quickActionSubtitle: { fontSize: 11 },
    dailyGoalPercent: {
      fontSize: 12,
      marginTop: 6,
      textAlign: "center",
    },
    expressReviewButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.primary,
    },
    expressReviewText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
      backgroundColor: colors.cardBackground,
    },
    statusItem: {
      alignItems: "center",
      flex: 1,
    },
    statusLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    statusValue: {
      fontSize: 18,
      fontWeight: "800",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
    subjectList: {
      paddingBottom: 16,
    },
    subjectCard: {
      width: 240,
      marginRight: 16,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
    },
    subjectIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    subjectTitle: {
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 6,
    },
    subjectSubtitle: {
      fontSize: 13,
      marginBottom: 18,
    },
    subjectFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    subjectProgress: {
      fontSize: 13,
      fontWeight: "700",
    },
    subjectTopics: {
      fontSize: 12,
    },
    recentCard: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    recentIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    recentInfo: {
      flex: 1,
    },
    recentTopic: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 2,
    },
    recentSubject: {
      fontSize: 13,
    },
    dueCard: {
      width: 220,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 16,
    },
    dueCardTitle: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 12,
    },
    dueMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dueTag: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: "700",
      color: colors.white,
    },
    difficultyHard: {
      backgroundColor: "#DC2626",
    },
    difficultyMedium: {
      backgroundColor: "#F59E0B",
    },
    difficultyEasy: {
      backgroundColor: "#10B981",
    },
    dueWhen: {
      fontSize: 12,
    },
    emptyState: {
      borderRadius: 24,
      borderWidth: 1,
      marginBottom: 20,
      padding: 18,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 6,
    },
    emptyHint: {
      fontSize: 13,
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: "75%",
      borderWidth: 1,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "800",
    },
    modalEmptyText: {
      fontSize: 15,
      textAlign: "center",
      marginTop: 24,
    },
    modalItem: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    modalItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    modalItemTitle: {
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
      marginRight: 10,
    },
    modalItemBadge: {
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      overflow: "hidden",
      color: "#FFFFFF",
    },
    modalItemText: {
      fontSize: 13,
      lineHeight: 20,
    },
    performanceItem: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    performanceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    performanceProgress: {
      fontSize: 14,
      fontWeight: "800",
    },
    performanceStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
    },
    performanceStat: {
      fontSize: 13,
    },
  });
