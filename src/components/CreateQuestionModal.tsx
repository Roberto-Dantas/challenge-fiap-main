import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useSettings } from "../context/SettingsContext";
import { ThemeColors } from "../theme/colors";

interface CreateQuestionModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (prompt: string, options: string[], correctOption: number, explanation: string) => void;
}

const optionLabels = ["A", "B", "C", "D"];

export default function CreateQuestionModal({ visible, onClose, onCreate }: CreateQuestionModalProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [explanation, setExplanation] = useState("");

  function close() {
    setPrompt("");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
    setExplanation("");
    onClose();
  }

  function create() {
    const filledOptions = options.map((option) => option.trim());
    if (!prompt.trim() || filledOptions.filter(Boolean).length < 2 || !filledOptions[correctOption]) return;
    onCreate(prompt, filledOptions, correctOption, explanation);
    close();
  }

  const canCreate = prompt.trim().length > 0 && options.filter((option) => option.trim()).length >= 2 && Boolean(options[correctOption].trim());

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.heading}>Nova questão</Text>
            <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Enunciado</Text>
            <TextInput style={[styles.input, styles.prompt]} value={prompt} onChangeText={setPrompt} multiline textAlignVertical="top" placeholder="Digite a pergunta..." placeholderTextColor={colors.textMuted} />
            <Text style={styles.label}>Alternativas</Text>
            {options.map((option, index) => (
              <View key={optionLabels[index]} style={styles.optionRow}>
                <Pressable style={[styles.radio, correctOption === index && styles.radioSelected]} onPress={() => setCorrectOption(index)}>
                  {correctOption === index && <View style={styles.radioDot} />}
                </Pressable>
                <Text style={styles.optionLabel}>{optionLabels[index]}</Text>
                <TextInput style={[styles.input, styles.optionInput]} value={option} onChangeText={(value) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} placeholder={`Alternativa ${optionLabels[index]}`} placeholderTextColor={colors.textMuted} />
              </View>
            ))}
            <Text style={styles.helper}>Toque no círculo para marcar a resposta correta.</Text>
            <Text style={styles.label}>Explicação (opcional)</Text>
            <TextInput style={[styles.input, styles.explanation]} value={explanation} onChangeText={setExplanation} multiline placeholder="Explique por que essa é a resposta..." placeholderTextColor={colors.textMuted} />
            <Pressable style={[styles.button, !canCreate && styles.disabled]} onPress={create} disabled={!canCreate}><Text style={styles.buttonText}>Salvar questão</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  container: { maxHeight: "92%", backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "700" },
  label: { color: colors.textSecondary, fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 15, padding: 12 },
  prompt: { minHeight: 90 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  radio: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  radioSelected: { borderColor: colors.primary },
  radioDot: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 },
  optionLabel: { color: colors.text, fontSize: 14, fontWeight: "700", width: 16 },
  optionInput: { flex: 1 },
  helper: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  explanation: { minHeight: 70 },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, marginTop: 20, paddingVertical: 14 },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
