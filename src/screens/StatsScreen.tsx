import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { ThemeColors } from "../theme/colors";
import { getCurrentStreak, getLongestStreak, getRecentActivity, getReviewAccuracy } from "../utils/studyMetrics";
import { getSubjectIcon } from "../utils/icons";
import Reveal from "../components/Reveal";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { subjects, flashcards, getReviewHistory } = useLibrary();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reviewHistory = getReviewHistory();
  const currentStreak = getCurrentStreak(reviewHistory);
  const longestStreak = getLongestStreak(reviewHistory);
  const accuracy = getReviewAccuracy(reviewHistory);
  const activity = getRecentActivity(reviewHistory);

  const perSubject = useMemo(() => {
    return subjects.map((subject) => {
      const subjectFlashcards = flashcards.filter((fc) =>
        subject.topics.some((t) => t.id === fc.topicId),
      );

      const reviewed = subjectFlashcards.filter((f) => f.reviewed).length;
      const topicIds = new Set(subject.topics.map((topic) => topic.id));
      const subjectHistory = reviewHistory.filter((review) => topicIds.has(review.topicId));
      const ok = subjectHistory.filter((review) => review.difficulty !== "hard").length;
      const toReview = subjectFlashcards.filter((f) => f.reviewed && !f.ok).length;

      return {
        id: subject.id,
        title: subject.title,
        reviewed,
        ok,
        toReview,
        total: subjectFlashcards.length,
        totalReviews: subjectHistory.length,
      };
    });
  }, [subjects, flashcards, reviewHistory]);

  // total number of review actions across all flashcards
  const totalReviewed = useMemo(() => {
    return reviewHistory.length;
  }, [reviewHistory]);

  // compute max value for chart scaling (use totalReviews and ok counts)
  const perSubjectExtended = useMemo(() => {
    return perSubject.map((s) => ({
      ...s,
      totalReviews: s.totalReviews,
    }));
  }, [perSubject, flashcards, subjects]);

  const maxCompareValue = useMemo(() => {
    let maxV = 0;
    perSubjectExtended.forEach((s) => {
      maxV = Math.max(maxV, s.totalReviews ?? 0, s.ok ?? 0);
    });
    return Math.max(maxV, 1);
  }, [perSubjectExtended]);

  const wrongBySubject = useMemo(() => {
    const map: Record<string, { title: string; items: typeof flashcards }> = {} as any;
    flashcards
      .filter((f) => f.reviewed && !f.ok)
      .forEach((f) => {
        const subject = subjects.find((s) => s.topics.some((t) => t.id === f.topicId));
        const sid = subject?.id ?? "-";
        if (!map[sid]) map[sid] = { title: subject?.title ?? "Geral", items: [] as any };
        map[sid].items.push(f as any);
      });

    return Object.entries(map).map(([id, v]) => ({ id, title: v.title, items: v.items }));
  }, [flashcards, subjects]);

  const reviewItems = useMemo(() => {
    return flashcards.filter((f) => f.reviewed && !f.ok).slice(0, 20);
  }, [flashcards]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}> 
      <Reveal style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Estatísticas</Text>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}><Ionicons name="flame" size={20} color={colors.warning} /><Text style={styles.heroValue}>{currentStreak}</Text><Text style={styles.heroLabel}>dias seguidos</Text></View>
          <View style={styles.heroStat}><Ionicons name="trending-up" size={20} color={colors.primary} /><Text style={styles.heroValue}>{accuracy}%</Text><Text style={styles.heroLabel}>precisão</Text></View>
          <View style={styles.heroStat}><Ionicons name="trophy" size={20} color={colors.warning} /><Text style={styles.heroValue}>{longestStreak}</Text><Text style={styles.heroLabel}>maior streak</Text></View>
        </View>

        <View style={styles.topStatsRow}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total revisado</Text>
            <Text style={styles.totalNumber}>{totalReviewed}</Text>
          </View>
          <View style={styles.chartCard}>
            <Text style={styles.totalLabel}>Porcentagem por matéria</Text>
            <View style={styles.miniChart}>
              {perSubject.map((s, subjectIndex) => {
                const percent = s.total > 0 ? Math.round((s.reviewed / s.total) * 100) : 0;
                return (
                  <View key={`${s.id}-${subjectIndex}`} style={styles.miniBarWrap}>
                    <View style={[styles.miniBarFill, { height: `${percent}%` }]} />
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Flashcards por dia</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityBars}>
            {activity.map((day) => <View key={day.key} style={styles.activityDay}><View style={styles.activityTrack}><View style={[styles.activityFill, { height: `${Math.min(100, day.count * 16 + (day.count > 0 ? 8 : 0))}%` }]} /></View><Text style={styles.activityLabel}>{day.label}</Text><Text style={styles.activityCount}>{day.count || "-"}</Text></View>)}
          </View>
          <Text style={styles.activityHint}>{reviewHistory.length === 0 ? "Comece uma revisão para criar seu histórico." : `Você já fez ${reviewHistory.length} revisões no total.`}</Text>
        </View>

        <Text style={styles.sectionTitle}>Desempenho por matéria</Text>
        {perSubjectExtended.length === 0 ? (
          <View style={styles.emptyStatsCard}><Ionicons name="bar-chart-outline" size={34} color={colors.primary} /><Text style={styles.emptyStatsTitle}>Ainda não há dados de desempenho</Text><Text style={styles.emptyStatsText}>Adicione uma matéria, crie flashcards e faça sua primeira revisão para acompanhar seu progresso aqui.</Text></View>
        ) : perSubjectExtended.map((s, subjectIndex) => {
          const percent = s.total > 0 ? Math.round((s.reviewed / s.total) * 100) : 0;
          const reviews = s.totalReviews ?? 0;
          const corrects = s.ok ?? 0;
          const reviewsWidth = Math.round((reviews / maxCompareValue) * 100);
          const correctsWidth = Math.round((corrects / maxCompareValue) * 100);

          return (
            <View key={`${s.id}-${subjectIndex}`} style={styles.statCard}>
              <View style={styles.statLeft}>
                <Text style={styles.statTitle}>{s.title}</Text>
                <Text style={styles.statSubtitle}>{s.total} flashcards • {reviews} revisões</Text>
                <View style={{ height: 8 }} />
                <View style={styles.compareRow}>
                  <View style={styles.compareLabel}><Text style={styles.smallLabel}>Revisões</Text></View>
                  <View style={styles.compareBarBg}>
                    <View style={[styles.reviewsBar, { width: `${reviewsWidth}%` }]} />
                  </View>
                  <Text style={styles.smallValue}>{reviews}</Text>
                </View>
                <View style={[styles.compareRow, { marginTop: 6 }]}>
                  <View style={styles.compareLabel}><Text style={styles.smallLabel}>Acertos</Text></View>
                  <View style={styles.compareBarBg}>
                    <View style={[styles.correctsBar, { width: `${correctsWidth}%` }]} />
                  </View>
                  <Text style={styles.smallValue}>{corrects}</Text>
                </View>
              </View>
              <View style={styles.statRight}>
                <Text style={styles.statNumber}>{percent}%</Text>
                <Text style={styles.statLabel}>Concluído</Text>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Flashcards errados</Text>
        {wrongBySubject.length === 0 ? (
          <Text style={styles.empty}>Nenhum flashcard marcado como errado</Text>
        ) : (
          wrongBySubject.map((group, groupIndex) => {
            const subject = subjects.find((s) => s.id === group.id);
            return (
              <View key={`${group.id}-${groupIndex}`} style={{ marginBottom: 12 }}>
                <Text style={[styles.statTitle, { marginBottom: 8 }]}>{group.title}</Text>
                {group.items.map((f: any, cardIndex: number) => (
                  <View key={`${f.id}-${cardIndex}`} style={styles.reviewRow}>
                    <View style={[styles.reviewIcon, { backgroundColor: subject?.iconBackground || colors.background }]}>
                      {getSubjectIcon(subject?.icon ?? "default", 18, subject?.iconColor || colors.primary)}
                    </View>
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewTitle} numberOfLines={1}>{f.front}</Text>
                      <Text style={styles.reviewSubtitle}>{subject?.title} • {subject?.topics.find((t) => t.id === f.topicId)?.title} • revisado {f.reviewedCount ?? 0}x</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
      </Reveal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textSecondary, marginBottom: 12 },
  topStatsRow: { flexDirection: "row", justifyContent: "flex-start", gap: 12, marginBottom: 12 },
  heroStats: { flexDirection: "row", gap: 8, marginBottom: 16 },
  heroStat: { alignItems: "center", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, padding: 12 },
  heroValue: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 5 },
  heroLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3, textAlign: "center" },
  totalCard: { alignItems: "center", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: "center", minWidth: 0, padding: 14 },
  totalLabel: { fontSize: 13, color: colors.textSecondary },
  totalNumber: { fontSize: 20, fontWeight: "800", color: colors.text },
  statCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBackground, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  statLeft: { flex: 1 },
  statTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  statSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  progressBarBg: { height: 10, backgroundColor: colors.background, borderRadius: 8, overflow: "hidden", marginTop: 10 },
  progressBarFill: { height: 10, backgroundColor: colors.primary },
  chartCard: { backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: "center", minWidth: 0, padding: 10 },
  miniChart: { alignItems: "flex-end", flexDirection: "row", gap: 5, height: 60, marginTop: 8 },
  miniBarWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end", marginHorizontal: 4, backgroundColor: "transparent" },
  miniBarFill: { width: "100%", backgroundColor: colors.primary, borderRadius: 6 },
  activityCard: { backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 18, padding: 14 },
  activityBars: { alignItems: "flex-end", flexDirection: "row", gap: 10, height: 112, justifyContent: "space-between" },
  activityDay: { alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" },
  activityTrack: { backgroundColor: colors.background, borderRadius: 6, height: 76, justifyContent: "flex-end", overflow: "hidden", width: "100%" },
  activityFill: { backgroundColor: colors.primary, borderRadius: 6, minHeight: 3, width: "100%" },
  activityLabel: { color: colors.textSecondary, fontSize: 10, marginTop: 6, textTransform: "uppercase" },
  activityCount: { color: colors.text, fontSize: 10, fontWeight: "800", marginTop: 2 },
  activityHint: { color: colors.textSecondary, fontSize: 12, marginTop: 12 },
  statRight: { alignItems: "center" },
  statNumber: { fontSize: 16, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  compareRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  compareLabel: { width: 72 },
  smallLabel: { fontSize: 12, color: colors.textSecondary },
  compareBarBg: { flex: 1, height: 10, backgroundColor: colors.background, borderRadius: 8, overflow: "hidden", marginHorizontal: 8 },
  reviewsBar: { height: 10, backgroundColor: "#60A5FA", borderRadius: 8 },
  correctsBar: { height: 10, backgroundColor: "#34D399", borderRadius: 8 },
  smallValue: { width: 30, textAlign: "right", color: colors.text, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 8 },
  emptyStatsCard: { alignItems: "center", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 16, padding: 24 },
  emptyStatsTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 12, textAlign: "center" },
  emptyStatsText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  reviewRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  reviewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  reviewInfo: { flex: 1 },
  reviewTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  reviewSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
