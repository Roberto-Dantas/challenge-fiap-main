import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { AccountStackParamList } from "../types";
import type { ThemeColors } from "../theme/colors";

type Props = NativeStackScreenProps<AccountStackParamList, "AccountMain">;
type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
}

export default function AccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { refreshLibrary } = useLibrary();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLibrary();
    } finally {
      setRefreshing(false);
    }
  }, [refreshLibrary]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const confirmLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, logout]);

  const handleLogout = useCallback(() => {
    if (Platform.OS === "web") {
      void confirmLogout();
      return;
    }

    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void confirmLogout() },
    ]);
  }, [confirmLogout]);

  const sections = useMemo<{ title: string; data: MenuItem[] }[]>(
    () => [
      {
        title: "Perfil e privacidade",
        data: [
          { label: "Editar Perfil", icon: "person-circle-outline", onPress: () => navigation.navigate("EditProfile") },
          { label: "Privacidade", icon: "lock-closed-outline", onPress: () => navigation.navigate("Privacy") },
        ],
      },
      {
        title: "Outros",
        data: [
          { label: "Preferências", icon: "options-outline", onPress: () => navigation.navigate("Settings") },
          { label: "Ajuda e Suporte", icon: "help-circle-outline", onPress: () => navigation.navigate("Help") },
          { label: loggingOut ? "Saindo..." : "Sair", icon: "exit-outline", destructive: true, onPress: handleLogout },
        ],
      },
    ],
    [handleLogout, loggingOut, navigation],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}><Ionicons name="person" size={32} color={colors.white} /></View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{user?.name ?? "Convidado"}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
            </View>
          </View>
          <Text style={styles.profileHint}>Gerencie seu perfil e as preferências do aplicativo.</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuGroup}>
              {section.data.map((item, index) => (
                <Pressable
                  key={item.label}
                  style={[styles.menuItem, index > 0 && styles.menuItemBorder]}
                  android_ripple={{ color: colors.background }}
                  onPress={item.onPress}
                  disabled={item.destructive && loggingOut}
                  accessibilityRole="button"
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon} size={20} color={item.destructive ? colors.danger : colors.primary} />
                  </View>
                  <Text style={[styles.menuLabel, item.destructive && styles.menuLabelDestructive]}>{item.label}</Text>
                  {!item.destructive && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footerText}>Versão 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: 36, paddingHorizontal: 20 },
    profileCard: { backgroundColor: colors.primary, borderRadius: 24, marginBottom: 28, padding: 22 },
    profileHeader: { alignItems: "center", flexDirection: "row" },
    avatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20, height: 62, justifyContent: "center", marginRight: 15, width: 62 },
    profileText: { flex: 1 },
    profileName: { color: colors.white, fontSize: 21, fontWeight: "800" },
    profileEmail: { color: "rgba(255,255,255,0.78)", fontSize: 13, marginTop: 4 },
    profileHint: { color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 19, marginTop: 18 },
    section: { marginBottom: 24 },
    sectionTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: "800", marginBottom: 10, textTransform: "uppercase" },
    menuGroup: { backgroundColor: colors.cardBackground, borderColor: colors.border, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
    menuItem: { alignItems: "center", flexDirection: "row", minHeight: 70, paddingHorizontal: 14 },
    menuItemBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
    menuIconContainer: { alignItems: "center", backgroundColor: colors.background, borderRadius: 12, height: 40, justifyContent: "center", marginRight: 13, width: 40 },
    menuLabel: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "600" },
    menuLabelDestructive: { color: colors.danger },
    footerText: { color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: "center" },
  });
}
