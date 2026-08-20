import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSettings } from "../../context/SettingsContext";
import { ThemeColors } from "../../theme/colors";
import { AccountStackParamList, ThemeMode } from "../../types";

type Props = NativeStackScreenProps<AccountStackParamList, "Settings">;

const themeOptions: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "light", label: "Claro", icon: "sunny-outline" },
  { key: "dark", label: "Escuro", icon: "moon-outline" },
];

const MAX_DAILY_GOAL = 1000;
const MAX_MONTHLY_GOAL = 100000;

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    theme,
    setTheme,
    colors,
    goalPeriod,
    dailyGoal,
    monthlyGoal,
    setGoalPeriod,
    setDailyGoal,
    setMonthlyGoal,
  } = useSettings();
  const styles = useMemoStyles(colors);
  const [goalValue, setGoalValue] = useState(String(goalPeriod === "daily" ? dailyGoal : monthlyGoal));

  useEffect(() => {
    setGoalValue(String(goalPeriod === "daily" ? dailyGoal : monthlyGoal));
  }, [dailyGoal, goalPeriod, monthlyGoal]);

  function handleGoalChange(value: string) {
    const limit = goalPeriod === "daily" ? MAX_DAILY_GOAL : MAX_MONTHLY_GOAL;
    const numericValue = value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "").slice(0, String(limit).length);
    setGoalValue(numericValue);
    const parsedValue = Number(numericValue);
    if (Number.isSafeInteger(parsedValue) && parsedValue > 0) {
      if (goalPeriod === "daily") setDailyGoal(parsedValue);
      else setMonthlyGoal(parsedValue);
    }
  }

  function handlePeriodChange(period: "daily" | "monthly") {
    setGoalPeriod(period);
    setGoalValue(String(period === "daily" ? dailyGoal : monthlyGoal));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Geral</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Meta de estudos</Text>
        <Text style={styles.description}>Defina quantos flashcards você quer revisar.</Text>
        <View style={styles.periodGroup}>
          <Pressable style={[styles.periodOption, goalPeriod === "daily" && styles.periodOptionSelected]} onPress={() => handlePeriodChange("daily")}>
            <Ionicons name="sunny-outline" size={18} color={goalPeriod === "daily" ? colors.white : colors.primary} />
            <Text style={[styles.periodLabel, goalPeriod === "daily" && styles.periodLabelSelected]}>Diária</Text>
          </Pressable>
          <Pressable style={[styles.periodOption, goalPeriod === "monthly" && styles.periodOptionSelected]} onPress={() => handlePeriodChange("monthly")}>
            <Ionicons name="calendar-outline" size={18} color={goalPeriod === "monthly" ? colors.white : colors.primary} />
            <Text style={[styles.periodLabel, goalPeriod === "monthly" && styles.periodLabelSelected]}>Mensal</Text>
          </Pressable>
        </View>
        <View style={styles.goalInputRow}>
          <TextInput
            style={styles.goalInput}
            value={goalValue}
            onChangeText={handleGoalChange}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <Text style={styles.goalUnit}>flashcards {goalPeriod === "daily" ? "por dia" : "por mês"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tema</Text>
        <View style={styles.themeGroup}>
          {themeOptions.map((option) => {
            const selected = option.key === theme;
            return (
              <Pressable
                key={option.key}
                style={[styles.themeOption, selected && styles.themeOptionSelected]}
                onPress={() => setTheme(option.key)}
              >
                <Ionicons name={option.icon} size={20} color={selected ? colors.white : colors.primary} />
                <Text style={[styles.themeOptionLabel, selected && styles.themeOptionLabelSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function useMemoStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    content: { paddingHorizontal: 20 },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    rowIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
    rowDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    themeGroup: { flexDirection: "row", gap: 12 },
    themeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeOptionLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
    themeOptionLabelSelected: { color: colors.white },
    description: { color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
    periodGroup: { flexDirection: "row", gap: 12, marginBottom: 12 },
    periodOption: { alignItems: "center", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 14 },
    periodOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    periodLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
    periodLabelSelected: { color: colors.white },
    goalInputRow: { alignItems: "center", backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", paddingHorizontal: 14 },
    goalInput: { color: colors.text, flex: 1, fontSize: 22, fontWeight: "800", paddingVertical: 14 },
    goalUnit: { color: colors.textSecondary, fontSize: 13 },
  });
}
