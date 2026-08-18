import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSettings } from "../context/SettingsContext";
import { isValidOcrText, recognizeTextFromImage } from "../services/ocrService";
import { ThemeColors } from "../theme/colors";

type ScanStep = "picker" | "processing" | "result";

interface OcrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
  title?: string;
}

export default function OcrScannerModal({
  visible,
  onClose,
  onConfirm,
  title = "Selecionar arquivo para OCR",
}: OcrScannerModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<ScanStep>("picker");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetAndClose() {
    setStep("picker");
    setSelectedImageUri(null);
    setRecognizedText("");
    setErrorMessage(null);
    onClose();
  }

  async function readImageBase64FromUri(uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const normalized = result.replace(/^data:.*;base64,/, "").trim();

        if (!normalized) {
          reject(new Error("A imagem selecionada não gerou base64 válido."));
          return;
        }

        resolve(normalized);
      };
      reader.onerror = () => reject(new Error("Falha ao converter a imagem para base64."));
      reader.readAsDataURL(blob);
    });
  }

  async function handlePickImage() {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setErrorMessage(
          "Você precisa permitir acesso à galeria ou arquivos do sistema para usar o OCR.",
        );
        setStep("result");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setErrorMessage("Nenhuma imagem foi selecionada.");
        setStep("result");
        return;
      }

      const asset = result.assets[0];
      setSelectedImageUri(asset.uri);
      setStep("processing");
      setErrorMessage(null);

      const base64 =
        typeof asset.base64 === "string" && asset.base64.length > 100
          ? asset.base64.replace(/^data:.*;base64,/, "").trim()
          : await readImageBase64FromUri(asset.uri);

      const recognized = await recognizeTextFromImage({
        uri: asset.uri,
        base64,
      });

      const trimmedText = recognized.text.trim();
      if (!isValidOcrText(trimmedText)) {
        setErrorMessage("Nenhum texto foi encontrado na imagem selecionada.");
        setStep("result");
        return;
      }

      setRecognizedText(trimmedText);
      onConfirm(trimmedText);
      resetAndClose();
    } catch (error: any) {
      console.warn("Falha ao selecionar/ler imagem do OCR", error);
      setErrorMessage(
        error?.message ??
        "Não foi possível ler o texto da imagem. Tente outro arquivo ou uma imagem com melhor legibilidade.",
      );
      setStep("result");
    }
  }

  function handleRetake() {
    setSelectedImageUri(null);
    setRecognizedText("");
    setErrorMessage(null);
    setStep("picker");
  }

  function handleConfirm() {
    if (!isValidOcrText(recognizedText)) return;
    onConfirm(recognizedText.trim());
    resetAndClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.container}>
        {step === "picker" && (
          <View style={[styles.centered, { paddingTop: insets.top }]}>
            <View style={styles.pickerCard}>
              <Ionicons name="images-outline" size={52} color={colors.primary} />
              <Text style={styles.permissionTitle}>{title}</Text>
              <Text style={styles.permissionText}>
                Escolha uma imagem da galeria ou arquivos do sistema para extrair o texto.
              </Text>
              <Pressable style={styles.primaryButton} onPress={handlePickImage}>
                <Text style={styles.primaryButtonText}>Selecionar arquivo</Text>
              </Pressable>
              <Pressable style={styles.linkButton} onPress={resetAndClose}>
                <Text style={styles.linkButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === "processing" && (
          <View style={[styles.centered, { paddingTop: insets.top }]}>
            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.previewImageBg} blurRadius={2} />
            )}
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>Lendo o texto da imagem…</Text>
            </View>
          </View>
        )}

        {step === "result" && (
          <ResultStep
            styles={styles}
            colors={colors}
            insets={insets}
            photoUri={selectedImageUri}
            recognizedText={recognizedText}
            setRecognizedText={setRecognizedText}
            errorMessage={errorMessage}
            onRetake={handleRetake}
            onConfirm={handleConfirm}
            onClose={resetAndClose}
          />
        )}
      </View>
    </Modal>
  );
}

function ResultStep({
  styles,
  colors,
  insets,
  photoUri,
  recognizedText,
  setRecognizedText,
  errorMessage,
  onRetake,
  onConfirm,
  onClose,
}: any) {
  const canConfirm = isValidOcrText(recognizedText) && !errorMessage;

  return (
    <View style={[styles.resultContainer, { paddingTop: insets.top + 12 }]}>
      <View style={styles.resultHeader}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.resultHeaderTitle}>Texto reconhecido</Text>
        <View style={{ width: 24 }} />
      </View>

      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.resultThumbnail} resizeMode="cover" />
      )}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.resultLabel}>
            Confira e edite o texto antes de continuar:
          </Text>
          <TextInput
            style={styles.resultInput}
            multiline
            value={recognizedText}
            onChangeText={setRecognizedText}
            placeholder="Nenhum texto reconhecido"
            placeholderTextColor={colors.textMuted}
          />
        </>
      )}

      <View style={styles.resultActions}>
        <Pressable style={[styles.secondaryButton]} onPress={onRetake}>
          <Ionicons name="images-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Selecionar outra</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, !canConfirm && styles.buttonDisabled]}
          onPress={onConfirm}
          disabled={!canConfirm}
        >
          <Text style={styles.primaryButtonText}>Continuar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      backgroundColor: colors.background,
    },
    pickerCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 28,
      width: "100%",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    permissionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    permissionText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    previewImageBg: {
      ...StyleSheet.absoluteFill,
      opacity: 0.5,
    },
    processingCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      paddingVertical: 28,
      paddingHorizontal: 32,
      alignItems: "center",
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    processingText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    resultContainer: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    resultHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    resultHeaderTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    resultThumbnail: {
      width: "100%",
      height: 140,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: colors.border,
    },
    resultLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    resultInput: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      fontSize: 15,
      color: colors.text,
      textAlignVertical: "top",
      minHeight: 140,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      padding: 16,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: colors.danger,
      lineHeight: 20,
    },
    resultActions: {
      flexDirection: "row",
      gap: 12,
      paddingVertical: 20,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.cardBackground,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
    primaryButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      paddingVertical: 14,
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    linkButton: {
      marginTop: 16,
    },
    linkButtonText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
  });
