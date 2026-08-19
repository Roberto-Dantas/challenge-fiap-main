import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useSettings } from "../context/SettingsContext";
import { ThemeColors } from "../theme/colors";

interface CreateSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, content: string) => void;
}

export default function CreateSummaryModal({ visible, onClose, onCreate }: CreateSummaryModalProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function close() {
    setTitle("");
    setContent("");
    onClose();
  }

  function create() {
    if (!title.trim() || !content.trim()) return;
    onCreate(title, content);
    close();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.heading}>Novo resumo</Text>
            <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Título</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Conceitos principais" placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Resumo</Text>
            <TextInput style={[styles.input, styles.largeInput]} value={content} onChangeText={setContent} multiline textAlignVertical="top" placeholder="Escreva os pontos mais importantes..." placeholderTextColor={colors.textMuted} />
            <Pressable style={[styles.button, (!title.trim() || !content.trim()) && styles.disabled]} onPress={create} disabled={!title.trim() || !content.trim()}>
              <Text style={styles.buttonText}>Salvar resumo</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  container: { maxHeight: "88%", backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "700" },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, padding: 14 },
  largeInput: { minHeight: 180 },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, marginTop: 20, paddingVertical: 14 },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
