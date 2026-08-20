import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSettings } from "../context/SettingsContext";
import { ThemeColors } from "../theme/colors";
import OcrScannerModal from "./OcrScannerModal";

interface ScanTextButtonProps {
  /** Chamado com o texto reconhecido quando o usuário toca em "Continuar". */
  onTextExtracted: (text: string) => void;
  /** Texto do botão. */
  label?: string;
  /** Título mostrado na tela da câmera/resultado. */
  scannerTitle?: string;
  /** "full": botão grande com fundo (ex: Home). "compact": botão pequeno tipo ícone+texto (ex: dentro de um form). */
  variant?: "full" | "compact";
  iconOnly?: boolean;
  openRequest?: number;
}

export default function ScanTextButton({
  onTextExtracted,
  label = "Escanear texto",
  scannerTitle,
  variant = "full",
  iconOnly = false,
  openRequest = 0,
}: ScanTextButtonProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (openRequest > 0) setScannerVisible(true);
  }, [openRequest]);

  return (
    <>
      {variant === "full" ? (
        <Pressable style={styles.fullButton} onPress={() => setScannerVisible(true)}>
          <View style={styles.fullIconWrap}>
            <Ionicons name="camera-outline" size={20} color={colors.white} />
          </View>
          <Text style={styles.fullButtonText}>{label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : (
        <Pressable style={iconOnly ? styles.iconOnlyButton : styles.compactButton} onPress={() => setScannerVisible(true)} accessibilityLabel={label || "Escanear texto"}>
          <Ionicons name={iconOnly ? "image-outline" : "camera-outline"} size={iconOnly ? 18 : 16} color={colors.white} />
          {!iconOnly && <Text style={styles.compactButtonText}>{label}</Text>}
        </Pressable>
      )}

      <OcrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onConfirm={onTextExtracted}
        title={scannerTitle ?? label}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fullButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fullIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    fullButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    compactButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    compactButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    iconOnlyButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, height: 32, justifyContent: "center", marginBottom: 8, width: 32 },
  });
