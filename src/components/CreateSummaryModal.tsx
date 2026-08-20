import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useSettings } from "../context/SettingsContext";
import { generateLocalSummary } from "../services/localAiService";
import { ThemeColors } from "../theme/colors";
import { MAX_TITLE_LENGTH } from "../types";
import ScanTextButton from "./ScanTextButton";

interface CreateSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, content: string) => void;
  initialTitle?: string;
  initialContent?: string;
  heading?: string;
}

export default function CreateSummaryModal({ visible, onClose, onCreate, initialTitle = "", initialContent = "", heading = "Novo resumo" }: CreateSummaryModalProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setContent(initialContent);
    }
  }, [initialContent, initialTitle, visible]);

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

  async function handleOcrText(text: string) {
    setIsGenerating(true);
    try {
      const generated = await generateLocalSummary(text);
      setTitle(generated.title.slice(0, MAX_TITLE_LENGTH));
      setContent(generated.content);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.heading}>{heading}</Text>
            <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Título</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={MAX_TITLE_LENGTH} placeholder="Ex: Conceitos principais" placeholderTextColor={colors.textMuted} />
            <Text style={styles.characterCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
            <Text style={styles.label}>Resumo</Text>
            <ScanTextButton
              variant="compact"
              label={isGenerating ? "Gerando..." : "Escanear e gerar com IA local"}
              scannerTitle="Texto para resumir"
              onTextExtracted={handleOcrText}
            />
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
  characterCount: { color: colors.textMuted, fontSize: 11, marginBottom: 4, marginTop: -8, textAlign: "right" },
});
