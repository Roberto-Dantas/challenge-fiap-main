import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMemo, useRef, useState } from "react";
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

type ScanStep = "camera" | "processing" | "result";

interface OcrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chamado quando o usuário confirma o texto reconhecido (botão "Continuar"). */
  onConfirm: (text: string) => void;
  /** Título exibido no topo da tela de resultado. Ex: "Texto da frente". */
  title?: string;
}

export default function OcrScannerModal({
  visible,
  onClose,
  onConfirm,
  title = "Escanear texto",
}: OcrScannerModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ScanStep>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  function resetAndClose() {
    setStep("camera");
    setPhotoUri(null);
    setRecognizedText("");
    setTextSelection({ start: 0, end: 0 });
    setErrorMessage(null);
    setIsCameraReady(false);
    onClose();
  }

  async function handleCapture() {
    if (!cameraRef.current || !isCameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: true,
      });

      if (!photo) return;

      setPhotoUri(photo.uri);
      setStep("processing");
      setErrorMessage(null);

      // Expo Go does not include ExpoImageManipulator. OCR uses the original image here;
      // a native crop can be added later in a development build without blocking startup.
      const result = await recognizeTextFromImage({
        uri: photo.uri,
        base64: photo.base64 ?? undefined,
      });
      setRecognizedText(result.text);
      setStep("result");
    } catch (error: any) {
      console.warn("Falha ao capturar/reconhecer texto", error);
      setErrorMessage(
        error?.message ??
          "Não foi possível ler o texto da foto. Tente novamente com mais luz e foco.",
      );
      setStep("result");
    }
  }

  async function handleUpload() {
    try {
      // Expo Go may not contain the native picker module. Load it only when needed.
      const ImagePicker = await import("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const image = result.assets[0];
      setPhotoUri(image.uri);
      setStep("processing");
      setErrorMessage(null);

      const recognized = await recognizeTextFromImage({
        uri: image.uri,
        base64: image.base64 ?? undefined,
      });
      setRecognizedText(recognized.text);
      setStep("result");
    } catch (error: any) {
      console.warn("Falha ao selecionar/reconhecer imagem", error);
      setErrorMessage(error?.message ?? "Não foi possível ler a imagem selecionada.");
      setStep("result");
    }
  }

  function handleRetake() {
    setPhotoUri(null);
    setRecognizedText("");
    setErrorMessage(null);
    setStep("camera");
  }

  function handleConfirm() {
    if (!isValidOcrText(recognizedText)) return;
    onConfirm(recognizedText.trim());
    resetAndClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.container}>
        {step === "camera" && (
          <CameraScanStep
            styles={styles}
            colors={colors}
            insets={insets}
            title={title}
            cameraRef={cameraRef}
            permission={permission}
            requestPermission={requestPermission}
            isCameraReady={isCameraReady}
            setIsCameraReady={setIsCameraReady}
            onCapture={handleCapture}
            onUpload={handleUpload}
            onClose={resetAndClose}
          />
        )}

        {step === "processing" && (
          <View style={[styles.centered, { paddingTop: insets.top }]}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImageBg} blurRadius={2} />}
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
            photoUri={photoUri}
            recognizedText={recognizedText}
            setRecognizedText={setRecognizedText}
            textSelection={textSelection}
            setTextSelection={setTextSelection}
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

function CameraScanStep({
  styles,
  colors,
  insets,
  title,
  cameraRef,
  permission,
  requestPermission,
  isCameraReady,
  setIsCameraReady,
  onCapture,
  onUpload,
  onClose,
}: any) {
  if (!permission) {
    return <View style={styles.centered} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.permissionTitle}>Precisamos da câmera</Text>
        <Text style={styles.permissionText}>
          {permission.canAskAgain
            ? "Permita o acesso à câmera para escanear o texto."
            : "O acesso à câmera está bloqueado. Habilite nas configurações do sistema."}
        </Text>
        {permission.canAskAgain && (
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Permitir acesso</Text>
          </Pressable>
        )}
        <Pressable style={styles.linkButton} onPress={onClose}>
          <Text style={styles.linkButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      />

      <View style={[styles.cameraTopBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconButton} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.cameraTitle}>{title}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.frameGuide} pointerEvents="none" />
      <Text style={styles.helperText}>Enquadre o texto e mantenha o aparelho firme</Text>

      <View style={[styles.cameraBottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.uploadButton} onPress={onUpload}>
          <Ionicons name="images-outline" size={18} color="#FFFFFF" />
          <Text style={styles.uploadButtonText}>Escolher foto</Text>
        </Pressable>
        <Pressable
          style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]}
          onPress={onCapture}
          disabled={!isCameraReady}
        >
          <View style={styles.captureButtonInner} />
        </Pressable>
      </View>
    </View>
  );
}

function ResultStep({
  styles,
  colors,
  insets,
  photoUri,
  recognizedText,
  setRecognizedText,
  textSelection,
  setTextSelection,
  errorMessage,
  onRetake,
  onConfirm,
  onClose,
}: any) {
  const canConfirm = isValidOcrText(recognizedText) && !errorMessage;
  const selectedText = recognizedText
    .slice(Math.min(textSelection.start, textSelection.end), Math.max(textSelection.start, textSelection.end))
    .trim();

  function handleUseSelection() {
    if (!selectedText) return;
    setRecognizedText(selectedText);
    setTextSelection({ start: 0, end: selectedText.length });
  }

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
            Confira e edite o texto se necessário antes de continuar:
          </Text>
          <TextInput
            style={styles.resultInput}
            multiline
            value={recognizedText}
            onChangeText={setRecognizedText}
            onSelectionChange={(event) => setTextSelection(event.nativeEvent.selection)}
            placeholder="Nenhum texto reconhecido"
            placeholderTextColor={colors.textMuted}
          />
          {selectedText.length > 0 && selectedText.length < recognizedText.trim().length && (
            <Pressable style={styles.selectionButton} onPress={handleUseSelection}>
              <Ionicons name="text-outline" size={17} color={colors.primary} />
              <Text style={styles.selectionButtonText}>Usar somente o texto selecionado</Text>
            </Pressable>
          )}
        </>
      )}

      <View style={styles.resultActions}>
        <Pressable style={[styles.secondaryButton]} onPress={onRetake}>
          <Ionicons name="camera-reverse-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Tirar novamente</Text>
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
      backgroundColor: "#000000",
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      backgroundColor: colors.background,
    },
    cameraContainer: {
      flex: 1,
      backgroundColor: "#000000",
    },
    cameraTopBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    cameraTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    frameGuide: {
      position: "absolute",
      top: "30%",
      left: "8%",
      right: "8%",
      height: "26%",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.85)",
      borderRadius: 16,
    },
    helperText: {
      position: "absolute",
      top: "58%",
      alignSelf: "center",
      color: "#FFFFFF",
      fontSize: 13,
      backgroundColor: "rgba(0,0,0,0.4)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    cameraBottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: "center",
      gap: 16,
    },
    uploadButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    uploadButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    captureButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 4,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    captureButtonDisabled: {
      opacity: 0.5,
    },
    captureButtonInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#FFFFFF",
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
    },
    processingText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
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
    selectionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 10,
      marginTop: 10,
    },
    selectionButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "700",
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
