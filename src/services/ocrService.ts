/**
 * Serviço de OCR (reconhecimento de texto em imagens).
 *
 * Igual ao AuthContext, aqui deixamos o "encaixe" pronto para uma API real,
 * mas com um modo demonstração (mock) que funciona sem nenhuma chave.
 *
 * PROVEDOR PADRÃO: "mlkit" — OCR 100% no aparelho (offline), usando o
 * Google ML Kit (Android) / Vision framework (iOS) via `expo-mlkit-ocr`.
 *
 * ⚠️ IMPORTANTE: OCR nativo (ML Kit) é código nativo de verdade — ele NÃO
 * funciona no Expo Go. É preciso gerar um "development build" (dev client)
 * uma vez:
 *
 *   npx expo prebuild --clean
 *   npx expo run:android      # ou: npx expo run:ios
 *   # ou, sem máquina Mac/Android Studio: eas build --profile development
 *
 * Depois disso, `npx expo start` funciona normalmente, só que abrindo pelo
 * app de dev client gerado (não mais pelo app "Expo Go" da loja).
 *
 * Enquanto isso não for feito (ex: testando no Expo Go), o app cai
 * automaticamente no modo demonstração e avisa isso na tela de resultado.
 *
 * OUTRAS OPÇÕES (trocando OCR_CONFIG.provider):
 *
 * 1) Google Cloud Vision (API na nuvem, funciona até no Expo Go):
 *    - Crie um projeto no Google Cloud, ative a "Cloud Vision API" e gere uma API key.
 *    - Preencha OCR_CONFIG.provider = "google" e OCR_CONFIG.apiKey abaixo.
 *
 * 2) Backend próprio (recomendado para produção — evita expor a API key no app):
 *    - Suba um endpoint (ex: POST /ocr) que recebe a imagem em base64 e devolve { text: string }.
 *    - Preencha OCR_CONFIG.provider = "custom" e OCR_CONFIG.customEndpoint com a URL do seu backend.
 *
 * Nenhuma tela precisa mudar — todas usam `recognizeTextFromImage()` deste arquivo.
 */

export const OCR_CONFIG = {
  // "mlkit" | "mock" | "google" | "custom"
  provider: "mlkit" as "mlkit" | "mock" | "google" | "custom",

  // Necessário apenas se provider === "google"
  // Cloud Vision API key (NÃO recomendado deixar hardcoded em produção).
  apiKey: "",

  // Necessário apenas se provider === "custom"
  // Endpoint do seu backend, ex: "https://sua-api.com/ocr"
  customEndpoint: "",
};

export interface OcrResult {
  text: string;
  confidence?: number;
}

export interface CapturedImage {
  /** URI local do arquivo (file://...), usado pelo ML Kit. */
  uri: string;
  /** Imagem em base64, usada pelos provedores em nuvem (Google/custom). */
  base64?: string;
}

/**
 * Envia a imagem capturada para o provedor de OCR configurado e retorna o
 * texto reconhecido.
 */
export async function recognizeTextFromImage(image: CapturedImage): Promise<OcrResult> {
  switch (OCR_CONFIG.provider) {
    case "mlkit":
      return recognizeWithMlKit(image.uri);
    case "google":
      return recognizeWithGoogleVision(image.base64 ?? "");
    case "custom":
      return recognizeWithCustomBackend(image.base64 ?? "");
    case "mock":
    default:
      return recognizeWithMock();
  }
}

async function recognizeWithMlKit(uri: string): Promise<OcrResult> {
  try {
    // Import dinâmico: em builds que não incluem o módulo nativo (ex: Expo Go),
    // isso lança um erro tratável em vez de quebrar o app inteiro no boot.
    const mlkit = await import("expo-mlkit-ocr");

    if (typeof mlkit.isSupported === "function" && !mlkit.isSupported()) {
      throw new Error(
        "Este dispositivo não é suportado pelo ML Kit de OCR.",
      );
    }

    const result = await mlkit.recognizeText(uri);

    if (!result.text.trim()) {
      throw new Error("Nenhum texto foi encontrado na imagem.");
    }

    return { text: result.text.trim() };
  } catch (error: any) {
    // Módulo nativo ausente = provavelmente rodando no Expo Go, ou o
    // development build ainda não foi gerado com `expo prebuild`.
    const isMissingNativeModule =
      typeof error?.message === "string" &&
      /native module|Cannot find|not been implemented/i.test(error.message);

    if (isMissingNativeModule) {
      throw new Error(
        "OCR nativo (ML Kit) indisponível. Isso é esperado no Expo Go — " +
          "gere um development build com `npx expo prebuild` + `npx expo run:android` " +
          "(ou `eas build --profile development`) para habilitar o OCR real no aparelho.",
      );
    }

    throw error;
  }
}

async function recognizeWithGoogleVision(base64Image: string): Promise<OcrResult> {
  if (!OCR_CONFIG.apiKey) {
    console.warn("OCR_CONFIG.apiKey não configurada, usando modo demonstração.");
    return recognizeWithMock();
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${OCR_CONFIG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Falha na requisição de OCR (${response.status})`);
  }

  const data = await response.json();
  const text: string = data?.responses?.[0]?.fullTextAnnotation?.text ?? "";

  if (!text.trim()) {
    throw new Error("Nenhum texto foi encontrado na imagem.");
  }

  return { text: text.trim() };
}

async function recognizeWithCustomBackend(base64Image: string): Promise<OcrResult> {
  if (!OCR_CONFIG.customEndpoint) {
    console.warn("OCR_CONFIG.customEndpoint não configurado, usando modo demonstração.");
    return recognizeWithMock();
  }

  const response = await fetch(OCR_CONFIG.customEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    throw new Error(`Falha na requisição de OCR (${response.status})`);
  }

  const data = await response.json();
  const text: string = data?.text ?? "";

  if (!text.trim()) {
    throw new Error("Nenhum texto foi encontrado na imagem.");
  }

  return { text: text.trim() };
}

/**
 * Modo demonstração: simula o tempo de processamento de um OCR real e
 * devolve um texto de exemplo, para que o fluxo de câmera → validação →
 * continuar funcione de ponta a ponta sem depender de nenhum build nativo.
 */
async function recognizeWithMock(): Promise<OcrResult> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return {
    text:
      "Texto reconhecido (modo demonstração).\n\n" +
      "Gere um development build (veja os comentários no topo de " +
      "src/services/ocrService.ts) para reconhecer o texto real da foto com o ML Kit.",
    confidence: 0.5,
  };
}

/**
 * Validação simples do texto retornado pelo OCR antes de liberar o botão
 * "Continuar" — evita repassar strings vazias/whitespace para o app.
 */
export function isValidOcrText(text: string): boolean {
  return text.trim().length > 0;
}

