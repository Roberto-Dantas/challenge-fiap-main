import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useMemo } from "react";

import { useSettings } from "../context/SettingsContext";
import { Subject, Topic } from "../types";
import { getSubjectIcon } from "../utils/icons";
import { AnimatedMotiPressable } from "./AnimatedMotiPressable";
import { AnimatedMotiView } from "./AnimatedMotiView";

interface SubjectCardProps {
  subject: Subject;
  expanded: boolean;
  onToggle: () => void;
  onTopicPress: (topic: Topic) => void;
  onAddTopic: () => void;
  onDelete: () => void;
  onStudy?: () => void;
  reviewedCount?: number;
  dueCount?: number;
  unreviewedCount?: number;
  topicStats?: Record<string, { total: number; due: number; reviewed: number; hard: number }>;
  containerStyle?: ViewStyle;
}

export default function SubjectCard({
  subject,
  expanded,
  onToggle,
  onTopicPress,
  onAddTopic,
  onDelete,
  onStudy,
  reviewedCount = 0,
  dueCount = 0,
  unreviewedCount = 0,
  topicStats = {},
  containerStyle,
}: SubjectCardProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const topicLabel =
    subject.topics.length === 1 ? "1 tópico" : `${subject.topics.length} tópicos`;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <AnimatedMotiPressable
        style={[styles.card, expanded && styles.cardExpanded]}
        onPress={onToggle}
        animate={({ pressed }: { pressed: boolean }) => ({ scale: pressed ? 0.975 : 1 })}
        transition={{ type: "spring", damping: 13, stiffness: 260 }}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: subject.iconBackground },
          ]}
        >
          {getSubjectIcon(subject.icon, 22, subject.iconColor)}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{subject.title}</Text>
          <Text style={styles.subtitle}>{topicLabel} · {subject.topics.length > 0 ? `${reviewedCount} revisados` : "comece adicionando um tópico"}</Text>
        </View>

        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={20}
          color={colors.textMuted}
        />
      </AnimatedMotiPressable>

      {expanded && (
        <AnimatedMotiView
          from={{ opacity: 0, height: 0, translateY: -12 }}
          animate={{ opacity: 1, height: "auto", translateY: 0 }}
          exit={{ opacity: 0, height: 0, translateY: -12 }}
          transition={{ type: "spring", damping: 18, stiffness: 170 }}
          style={styles.topicsContainer}
        >
          <View style={styles.summaryRow}>
            <View><Text style={styles.summaryValue}>{dueCount}</Text><Text style={styles.summaryLabel}>para hoje</Text></View>
            <View><Text style={styles.summaryValue}>{unreviewedCount}</Text><Text style={styles.summaryLabel}>novos</Text></View>
            <View><Text style={styles.summaryValue}>{reviewedCount}</Text><Text style={styles.summaryLabel}>revisados</Text></View>
            {onStudy && <Pressable style={styles.studyButton} onPress={onStudy}><Ionicons name="play" size={15} color={colors.white} /><Text style={styles.studyButtonText}>Estudar</Text></Pressable>}
          </View>
          <Pressable style={styles.addTopicButton} onPress={onAddTopic}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addTopicText}>Novo conteúdo</Text>
          </Pressable>
          <Pressable style={styles.deleteSubjectButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteSubjectText}>Excluir matéria</Text>
          </Pressable>
          {subject.topics.length === 0 ? (
            <Text style={styles.emptyTopics}>Nenhum tópico cadastrado</Text>
          ) : (
            subject.topics.map((topic, topicIndex) => (
              <AnimatedMotiPressable
                key={`${topic.id}-${topicIndex}`}
                style={styles.topicRow}
                onPress={() => onTopicPress(topic)}
                from={{ opacity: 0, translateX: -16 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: "timing", duration: 260, delay: topicIndex * 55 }}
              >
                <View style={styles.topicIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                {topicStats[topic.id] && <Text style={styles.topicMeta}>{topicStats[topic.id].due > 0 ? `${topicStats[topic.id].due} hoje` : topicStats[topic.id].total === 0 ? "Vazio" : topicStats[topic.id].reviewed === topicStats[topic.id].total ? "Concluído" : "Em andamento"}</Text>}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </AnimatedMotiPressable>
            ))
          )}
        </AnimatedMotiView>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>['colors']) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: 12,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    topicsContainer: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    summaryRow: { flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    summaryValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
    summaryLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    studyButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, flexDirection: "row", gap: 5, marginLeft: "auto", paddingHorizontal: 11, paddingVertical: 9 },
    studyButtonText: { color: colors.white, fontSize: 12, fontWeight: "800" },
    addTopicButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 14,
    },
    addTopicText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    deleteSubjectButton: {
      alignItems: "center",
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 14,
    },
    deleteSubjectText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "700",
    },
    topicRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    topicIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: "#EFF6FF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    topicTitle: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
    },
    topicMeta: { color: colors.textSecondary, fontSize: 11, marginRight: 8 },
    topicBadge: {
      backgroundColor: "#E0F2FE",
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 8,
    },
    topicBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
    },
    emptyTopics: {
      padding: 16,
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 14,
    },
  });
