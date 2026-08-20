import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useSettings } from "../context/SettingsContext";
import { ThemeColors } from "../theme/colors";
import { MAX_TITLE_LENGTH } from "../types";

interface CreateTopicModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export default function CreateTopicModal({ visible, onClose, onCreate }: CreateTopicModalProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState("");

  function close() {
    setTitle("");
    onClose();
  }

  function create() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onCreate(trimmedTitle);
    close();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Novo conteúdo</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.label}>Nome do conteúdo</Text>
          <TextInput
            autoFocus
            style={styles.input}
            placeholder="Ex: Introdução à matéria"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_TITLE_LENGTH}
            onSubmitEditing={create}
            returnKeyType="done"
          />
          <Text style={styles.characterCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
          <Pressable
            style={[styles.button, !title.trim() && styles.buttonDisabled]}
            onPress={create}
            disabled={!title.trim()}
          >
            <Text style={styles.buttonText}>Criar conteúdo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
    container: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 32,
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    title: { fontSize: 20, fontWeight: "700", color: colors.text },
    label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, marginBottom: 20 },
    button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
    characterCount: { color: colors.textMuted, fontSize: 11, marginBottom: 8, marginTop: -8, textAlign: "right" },
  });
