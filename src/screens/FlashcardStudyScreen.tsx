import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CreateFlashcardModal from "../components/CreateFlashcardModal";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { FlashcardDifficulty, LibraryStackParamList } from "../types";
import { ThemeColors } from "../theme/colors";

type Props = NativeStackScreenProps<LibraryStackParamList, "FlashcardStudy">;

export default function FlashcardStudyScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    topicId,
    subjectTitle,
    subjectSubtitle = "",
    topicTitle,
    startIndex = 0,
    flashcardId,
    reviewOnlyUnreviewed,
  } = route.params;
  const {
    getFlashcardsByTopic,
    markFlashcardReviewed,
    updateFlashcard,
    deleteFlashcard,
  } = useLibrary();

  const allTopicFlashcards = getFlashcardsByTopic(topicId);
  const flashcards = useMemo(
    () => reviewOnlyUnreviewed
      ? allTopicFlashcards.filter((card) => !card.reviewed)
      : allTopicFlashcards,
    [allTopicFlashcards, reviewOnlyUnreviewed],
  );
  const selectedIndex = flashcardId
    ? flashcards.findIndex((card) => card.id === flashcardId)
    : startIndex;
  const [currentIndex, setCurrentIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const [showBack, setShowBack] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    const stackNavigation = navigation.getParent();
    const tabNavigation = stackNavigation?.getParent() ?? stackNavigation;
    tabNavigation?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      tabNavigation?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  useEffect(() => {
    const nextIndex = flashcardId
      ? flashcards.findIndex((card) => card.id === flashcardId)
      : startIndex;
    setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
    setShowBack(false);
    setStudyComplete(false);
  }, [flashcardId, reviewOnlyUnreviewed, startIndex]);

  const total = flashcards.length;
  const safeIndex = total > 0 ? Math.min(Math.max(currentIndex, 0), total - 1) : 0;
  const currentCard = flashcards[safeIndex];
  const progress = total > 0 ? (safeIndex + 1) / total : 0;
  const cardText = currentCard ? (showBack ? currentCard.back : currentCard.front) : "";

  function moveTo(index: number) {
    if (index < 0 || index >= total) return;
    setCurrentIndex(index);
    setShowBack(false);
  }

  function handleBackToContent() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("ContentDetail", { topicId, subjectTitle, subjectSubtitle, topicTitle });
  }

  function handlePass() {
    if (safeIndex < total - 1) {
      moveTo(safeIndex + 1);
    } else {
      setStudyComplete(true);
    }
  }

  function handleReview(difficulty: FlashcardDifficulty) {
    if (!currentCard) return;
    void markFlashcardReviewed(currentCard.id, difficulty);
    if (safeIndex < total - 1) {
      moveTo(safeIndex + 1);
    } else {
      setStudyComplete(true);
    }
  }

  function handleDelete() {
    if (!currentCard) return;
    Alert.alert("Apagar flashcard?", "Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          deleteFlashcard(currentCard.id);
          if (total <= 1) {
            handleBackToContent();
          } else {
            setCurrentIndex(Math.min(safeIndex, total - 2));
          }
        },
      },
    ]);
  }

  if (total === 0 || !currentCard) {
    return (
      <LinearGradient colors={[colors.primaryDark, colors.primary, colors.primaryLight]} style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleBackToContent} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={48} color={colors.white} />
          <Text style={styles.emptyText}>Nenhum flashcard para estudar</Text>
          <Pressable style={styles.backButton} onPress={handleBackToContent}>
            <Text style={styles.backButtonText}>Voltar ao conteúdo</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  if (studyComplete) {
    return (
      <LinearGradient colors={[colors.primaryDark, colors.primary, colors.primaryLight]} style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBackToContent} hitSlop={8}><Ionicons name="arrow-back" size={24} color={colors.white} /></Pressable>
          <View style={styles.headerTitle}><Text style={styles.subjectTitle}>{subjectTitle}</Text><Text style={styles.topicTitle}>{topicTitle}</Text></View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.completeState}>
          <Ionicons name="trophy-outline" size={52} color={colors.white} />
          <Text style={styles.completeTitle}>Estudo concluído</Text>
          <Text style={styles.completeSubtitle}>Você revisou {total} flashcard{total !== 1 ? "s" : ""}.</Text>
          <Pressable style={styles.backButton} onPress={handleBackToContent}><Text style={styles.backButtonText}>Voltar ao conteúdo</Text></Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.primaryDark, colors.primary, colors.primaryLight]} style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBackToContent} hitSlop={8}><Ionicons name="arrow-back" size={24} color={colors.white} /></Pressable>
        <View style={styles.headerTitle}><Text style={styles.subjectTitle}>{subjectTitle}</Text><Text style={styles.topicTitle}>{topicTitle}</Text></View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setEditModalVisible(true)} hitSlop={8}><Ionicons name="create-outline" size={22} color={colors.white} /></Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}><Ionicons name="trash-outline" size={22} color={colors.white} /></Pressable>
        </View>
      </View>

      <View style={styles.progressSection}><View style={styles.progressRow}><Text style={styles.progressText}>{safeIndex + 1} de {total}</Text><Text style={styles.progressText}>{Math.round(progress * 100)}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View></View>

      <Pressable style={styles.card} onPress={() => setShowBack((value) => !value)}>
        <Text style={styles.cardText}>{cardText}</Text>
        <Text style={styles.flipHint}>{showBack ? "Toque para ver a pergunta" : "Toque para ver a resposta"}</Text>
      </Pressable>

      <View style={styles.controls}>
        <Pressable style={[styles.circleButton, safeIndex === 0 && styles.disabled]} onPress={() => moveTo(safeIndex - 1)} disabled={safeIndex === 0} accessibilityLabel="Flashcard anterior"><Ionicons name="chevron-back" size={22} color={colors.white} /></Pressable>
        <Pressable style={[styles.circleButton, styles.hard]} onPress={() => handleReview("hard")} accessibilityLabel="Difícil"><Ionicons name="close" size={22} color={colors.white} /></Pressable>
        <Pressable style={[styles.circleButton, styles.medium]} onPress={() => handleReview("medium")} accessibilityLabel="Médio"><Ionicons name="remove" size={22} color={colors.white} /></Pressable>
        <Pressable style={[styles.circleButton, styles.easy]} onPress={() => handleReview("easy")} accessibilityLabel="Fácil"><Ionicons name="checkmark" size={22} color={colors.white} /></Pressable>
        <Pressable style={styles.nextButton} onPress={handlePass} accessibilityLabel="Passar flashcard"><Ionicons name={safeIndex === total - 1 ? "checkmark" : "chevron-forward"} size={24} color={colors.primary} /></Pressable>
      </View>

      <CreateFlashcardModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} initialFront={currentCard.front} initialBack={currentCard.back} title="Ajustar flashcard" submitLabel="Salvar alterações" onCreate={(front, back) => updateFlashcard(currentCard.id, { front, back })} />
    </LinearGradient>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerTitle: { flex: 1, alignItems: "center" },
  headerRight: { width: 62, flexDirection: "row", justifyContent: "flex-end", gap: 14 },
  subjectTitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 4 },
  topicTitle: { color: colors.white, fontSize: 21, fontWeight: "700", textAlign: "center" },
  progressSection: { marginBottom: 20 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressText: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, height: 5, overflow: "hidden" },
  progressFill: { backgroundColor: colors.white, borderRadius: 3, height: "100%" },
  card: { flex: 1, alignItems: "center", backgroundColor: "#3B82F6", borderColor: "rgba(255,255,255,0.2)", borderRadius: 28, borderWidth: 1, justifyContent: "center", marginBottom: 24, padding: 28 },
  cardText: { color: colors.white, fontSize: 23, fontWeight: "600", lineHeight: 33, textAlign: "center" },
  flipHint: { bottom: 22, color: "rgba(255,255,255,0.7)", fontSize: 12, position: "absolute" },
  controls: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "center" },
  circleButton: { alignItems: "center", borderRadius: 23, height: 46, justifyContent: "center", width: 46 },
  hard: { backgroundColor: "#EF4444" },
  medium: { backgroundColor: "#F59E0B" },
  easy: { backgroundColor: "#10B981" },
  nextButton: { alignItems: "center", backgroundColor: colors.white, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  disabled: { opacity: 0.4 },
  emptyState: { alignItems: "center", flex: 1, justifyContent: "center" },
  emptyText: { color: colors.white, fontSize: 18, fontWeight: "700", marginTop: 16 },
  completeState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  completeTitle: { color: colors.white, fontSize: 25, fontWeight: "800", marginTop: 20, textAlign: "center" },
  completeSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 16, marginTop: 10, textAlign: "center" },
  backButton: { backgroundColor: colors.white, borderRadius: 24, marginTop: 24, paddingHorizontal: 22, paddingVertical: 13 },
  backButtonText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
});
