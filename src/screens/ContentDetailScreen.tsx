import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CreateFlashcardModal from "../components/CreateFlashcardModal";
import CreateQuestionModal from "../components/CreateQuestionModal";
import CreateSummaryModal from "../components/CreateSummaryModal";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { LibraryStackParamList, Question } from "../types";
import { ThemeColors } from "../theme/colors";

type Props = NativeStackScreenProps<LibraryStackParamList, "ContentDetail">;
type ContentTab = "flashcards" | "summaries" | "questions";

export default function ContentDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { topicId, subjectTitle, subjectSubtitle, topicTitle } = route.params;
  const {
    getFlashcardsByTopic,
    getSummariesByTopic,
    getQuestionsByTopic,
    addFlashcard,
    addSummary,
    addQuestion,
  } = useLibrary();
  const [activeTab, setActiveTab] = useState<ContentTab>("flashcards");
  const [searchQuery, setSearchQuery] = useState("");
  const [flashcardModalVisible, setFlashcardModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const flashcards = getFlashcardsByTopic(topicId);
  const summaries = getSummariesByTopic(topicId);
  const questions = getQuestionsByTopic(topicId);
  const query = searchQuery.trim().toLowerCase();
  const filteredFlashcards = flashcards.filter((card) => !query || card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query));
  const filteredSummaries = summaries.filter((summary) => !query || summary.title.toLowerCase().includes(query) || summary.content.toLowerCase().includes(query));
  const filteredQuestions = questions.filter((question) => !query || question.prompt.toLowerCase().includes(query) || question.options.some((option) => option.toLowerCase().includes(query)));

  function handleStartStudy(startIndex = 0, flashcardId?: string) {
    const dueCards = flashcards.filter((card) => card.nextReviewAt === undefined || card.nextReviewAt <= Date.now());
    const unreviewedCards = flashcards.filter((card) => !card.reviewed);
    const studyCards = unreviewedCards.length > 0 ? unreviewedCards : dueCards.length > 0 ? dueCards : flashcards;
    if (studyCards.length === 0) return;
    const selectedIndex = flashcardId ? studyCards.findIndex((card) => card.id === flashcardId) : studyCards.findIndex((card) => card.id === flashcards[startIndex]?.id);
    navigation.navigate("FlashcardStudy", { topicId, subjectTitle, subjectSubtitle, topicTitle, startIndex: selectedIndex >= 0 ? selectedIndex : 0, flashcardId, reviewOnlyUnreviewed: !flashcardId && unreviewedCards.length > 0 });
  }

  function renderFlashcards() {
    return (
      <>
        {filteredFlashcards.length > 0 && <Pressable style={styles.studyBanner} onPress={() => handleStartStudy()}><View style={styles.bannerIcon}><Ionicons name="play" size={20} color={colors.primary} /></View><View style={styles.bannerText}><Text style={styles.bannerTitle}>Estudar flashcards</Text><Text style={styles.bannerSubtitle}>{flashcards.length} cards disponíveis</Text></View><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></Pressable>}
        {filteredFlashcards.length === 0 ? <EmptyState icon="layers-outline" title="Nenhum flashcard ainda" description="Crie cartões com pergunta e resposta para revisar este conteúdo." onPress={() => setFlashcardModalVisible(true)} buttonLabel="Criar flashcard" styles={styles} colors={colors} /> : filteredFlashcards.map((card, cardIndex) => <Pressable key={`${card.id}-${cardIndex}`} style={styles.itemCard} onPress={() => handleStartStudy(cardIndex, card.id)}><View style={styles.itemIcon}><Ionicons name="layers-outline" size={19} color={colors.primary} /></View><View style={styles.itemBody}><Text style={styles.itemTitle}>{card.front}</Text><Text style={styles.itemDescription} numberOfLines={2}>{card.back}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>)}
      </>
    );
  }

  function renderSummaries() {
    return filteredSummaries.length === 0 ? <EmptyState icon="document-text-outline" title="Nenhum resumo ainda" description="Organize as ideias principais deste conteúdo em um texto rápido de consultar." onPress={() => setSummaryModalVisible(true)} buttonLabel="Criar resumo" styles={styles} colors={colors} /> : <>{filteredSummaries.map((summary, summaryIndex) => <View key={`${summary.id}-${summaryIndex}`} style={styles.itemCard}><View style={[styles.itemIcon, { backgroundColor: colors.primary + "18" }]}><Ionicons name="document-text-outline" size={19} color={colors.primary} /></View><View style={styles.itemBody}><Text style={styles.itemTitle}>{summary.title}</Text><Text style={styles.itemDescription}>{summary.content}</Text></View></View>)}</>;
  }

  function shuffleQuestions(items: Question[]) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function startQuiz() {
    setQuizQuestions(shuffleQuestions(filteredQuestions));
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setQuizFinished(false);
  }

  function answerQuestion(answerIndex: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    if (answerIndex === quizQuestions[quizIndex]?.correctOption) {
      setQuizScore((score) => score + 1);
    }
  }

  function nextQuizQuestion() {
    if (selectedAnswer === null) return;
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizFinished(true);
      return;
    }
    setQuizIndex((index) => index + 1);
    setSelectedAnswer(null);
  }

  function renderQuestions() {
    if (filteredQuestions.length === 0) {
      return <EmptyState icon="help-circle-outline" title="Nenhuma questão ainda" description="Crie questões de múltipla escolha para testar o que você aprendeu." onPress={() => setQuestionModalVisible(true)} buttonLabel="Criar questão" styles={styles} colors={colors} />;
    }

    if (quizQuestions.length === 0) {
      return <View style={styles.quizStart}><Ionicons name="school-outline" size={54} color={colors.primary} /><Text style={styles.quizTitle}>Questionário</Text><Text style={styles.quizDescription}>{filteredQuestions.length} questão{filteredQuestions.length !== 1 ? "ões" : ""} disponível{filteredQuestions.length !== 1 ? "eis" : ""}. As perguntas serão embaralhadas.</Text><Pressable style={styles.quizButton} onPress={startQuiz}><Ionicons name="play" size={18} color={colors.white} /><Text style={styles.quizButtonText}>Iniciar questionário</Text></Pressable></View>;
    }

    if (quizFinished) {
      return <View style={styles.quizStart}><Ionicons name="trophy-outline" size={56} color={colors.warning} /><Text style={styles.quizTitle}>Questionário concluído</Text><Text style={styles.scoreText}>{quizScore} de {quizQuestions.length}</Text><Text style={styles.quizDescription}>Pontuação: {Math.round((quizScore / quizQuestions.length) * 100)}%</Text><Pressable style={styles.quizButton} onPress={startQuiz}><Ionicons name="refresh" size={18} color={colors.white} /><Text style={styles.quizButtonText}>Refazer questionário</Text></Pressable></View>;
    }

    const question = quizQuestions[quizIndex];
    const isCorrect = selectedAnswer === question.correctOption;
      return <View><View style={styles.quizProgress}><Text style={styles.quizProgressText}>Questão {quizIndex + 1} de {quizQuestions.length}</Text><Text style={styles.quizProgressText}>Pontuação: {quizScore}</Text></View><View style={styles.questionCard}><Text style={styles.quizQuestion}>{question.prompt}</Text>{question.options.map((option, index) => { const isSelected = selectedAnswer === index; const isRight = index === question.correctOption; return <Pressable key={`${question.id}-${index}`} style={[styles.answerRow, isSelected && (isRight ? styles.correctAnswer : styles.wrongAnswer), selectedAnswer !== null && isRight && styles.correctAnswer]} onPress={() => answerQuestion(index)} disabled={selectedAnswer !== null}><Text style={styles.answerLabel}>{String.fromCharCode(65 + index)}</Text><Text style={styles.answerText}>{option}</Text>{selectedAnswer !== null && isRight && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}{isSelected && !isRight && <Ionicons name="close-circle" size={18} color={colors.danger} />}</Pressable>; })}{selectedAnswer !== null && <View style={[styles.feedbackBox, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}><Text style={styles.feedbackTitle}>{isCorrect ? "Correto!" : "Incorreto"}</Text><Text style={styles.feedbackText}>{isCorrect ? "Boa resposta." : `A alternativa correta é ${String.fromCharCode(65 + question.correctOption)}.`}</Text>{question.explanation && <Text style={styles.feedbackText}>{question.explanation}</Text>}</View>}<Pressable style={[styles.quizButton, selectedAnswer === null && styles.disabledButton]} onPress={nextQuizQuestion} disabled={selectedAnswer === null}><Text style={styles.quizButtonText}>{quizIndex === quizQuestions.length - 1 ? "Ver resultado" : "Próxima questão"}</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable></View></View>;
  }

  const tabData: { key: ContentTab; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: "flashcards", label: "Flashcards", icon: "layers-outline", count: flashcards.length },
    { key: "summaries", label: "Resumos", icon: "document-text-outline", count: summaries.length },
    { key: "questions", label: "Questões", icon: "help-circle-outline", count: questions.length },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}><Pressable onPress={() => navigation.goBack()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={colors.white} /></Pressable><View style={styles.headerActions}><Pressable hitSlop={8}><Ionicons name="share-outline" size={22} color={colors.white} /></Pressable><Pressable hitSlop={8}><Ionicons name="bookmark-outline" size={22} color={colors.white} /></Pressable></View></View>
        <Text style={styles.subjectTitle}>{subjectTitle}</Text><Text style={styles.subjectSubtitle}>{subjectSubtitle}</Text><Text style={styles.topicTitle}>{topicTitle}</Text>
        <View style={styles.searchContainer}><Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" /><TextInput style={styles.searchInput} placeholder="Pesquisar neste conteúdo" placeholderTextColor="rgba(255,255,255,0.6)" value={searchQuery} onChangeText={setSearchQuery} /></View>
      </LinearGradient>
      <View style={styles.tabs}>{tabData.map((tab) => <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.activeTab]} onPress={() => setActiveTab(tab.key)}><Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text><Text style={[styles.tabCount, activeTab === tab.key && styles.activeTabText]}>{tab.count}</Text></Pressable>)}</View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{tabData.find((tab) => tab.key === activeTab)?.label}</Text><Text style={styles.sectionSubtitle}>Conteúdo salvo nesta matéria</Text></View><Pressable style={styles.addButton} onPress={() => activeTab === "flashcards" ? setFlashcardModalVisible(true) : activeTab === "summaries" ? setSummaryModalVisible(true) : setQuestionModalVisible(true)}><Ionicons name="add" size={18} color={colors.white} /><Text style={styles.addButtonText}>Adicionar</Text></Pressable></View>
        {activeTab === "flashcards" ? renderFlashcards() : activeTab === "summaries" ? renderSummaries() : renderQuestions()}
      </ScrollView>
      <CreateFlashcardModal visible={flashcardModalVisible} onClose={() => setFlashcardModalVisible(false)} onCreate={(front, back) => addFlashcard({ topicId, front, back })} />
      <CreateSummaryModal visible={summaryModalVisible} onClose={() => setSummaryModalVisible(false)} onCreate={(title, content) => addSummary({ topicId, title, content })} />
      <CreateQuestionModal visible={questionModalVisible} onClose={() => setQuestionModalVisible(false)} onCreate={(prompt, options, correctOption, explanation) => addQuestion({ topicId, prompt, options, correctOption, explanation })} />
    </View>
  );
}

function EmptyState({ icon, title, description, buttonLabel, onPress, styles, colors }: any) {
  return <View style={styles.emptyState}><Ionicons name={icon} size={48} color={colors.textMuted} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDescription}>{description}</Text><Pressable style={styles.emptyButton} onPress={onPress}><Text style={styles.emptyButtonText}>{buttonLabel}</Text></Pressable></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 22, paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  headerActions: { flexDirection: "row", gap: 18 },
  subjectTitle: { color: colors.white, fontSize: 26, fontWeight: "800" },
  subjectSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 3 },
  topicTitle: { color: colors.white, fontSize: 17, fontWeight: "700", marginTop: 8, marginBottom: 18 },
  searchContainer: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { color: colors.white, flex: 1, fontSize: 15 },
  tabs: { backgroundColor: colors.cardBackground, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: 12 },
  tab: { alignItems: "center", borderBottomColor: "transparent", borderBottomWidth: 3, flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", paddingVertical: 14 },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  activeTabText: { color: colors.primary },
  tabCount: { color: colors.textMuted, fontSize: 12 },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 36 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  sectionSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  addButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 9 },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  studyBanner: { alignItems: "center", borderColor: colors.primary, borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 14, padding: 14 },
  bannerIcon: { alignItems: "center", backgroundColor: colors.primary + "18", borderRadius: 20, height: 40, justifyContent: "center", marginRight: 12, width: 40 },
  bannerText: { flex: 1 },
  bannerTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  bannerSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  itemCard: { alignItems: "flex-start", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 12, padding: 14 },
  itemIcon: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 10, height: 38, justifyContent: "center", marginRight: 12, width: 38 },
  itemBody: { flex: 1 },
  itemTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 21 },
  itemDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 5 },
  emptyState: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 42 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 14 },
  emptyDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  emptyButton: { backgroundColor: colors.primary, borderRadius: 12, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  questionCard: { backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 14 },
  questionHeader: { alignItems: "flex-start", flexDirection: "row", marginBottom: 12 },
  quizStart: { alignItems: "center", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 28 },
  quizTitle: { color: colors.text, fontSize: 21, fontWeight: "800", marginTop: 14, textAlign: "center" },
  quizDescription: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  quizButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 20, paddingHorizontal: 18, paddingVertical: 13 },
  quizButtonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  quizProgress: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  quizProgressText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  quizQuestion: { color: colors.text, fontSize: 18, fontWeight: "700", lineHeight: 25, marginBottom: 8 },
  scoreText: { color: colors.primary, fontSize: 34, fontWeight: "800", marginTop: 14 },
  answerRow: { alignItems: "center", borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", marginTop: 8, padding: 10 },
  correctAnswer: { backgroundColor: colors.primary + "22", borderColor: colors.primary },
  wrongAnswer: { backgroundColor: colors.danger + "22", borderColor: colors.danger },
  answerLabel: { color: colors.primary, fontSize: 13, fontWeight: "800", marginRight: 9 },
  answerText: { color: colors.text, flex: 1, fontSize: 14 },
  feedbackBox: { borderRadius: 12, marginTop: 14, padding: 12 },
  feedbackCorrect: { backgroundColor: colors.primary + "22" },
  feedbackWrong: { backgroundColor: colors.danger + "22" },
  feedbackTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  feedbackText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  disabledButton: { opacity: 0.45 },
  explanation: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 12 },
});
