/**
 * Serviço de OCR (reconhecimento de texto em imagens).
 *
 * Este app usa a API gratuita OCR.Space para funcionar em Expo/Web sem build nativa.
 * O Google Vision foi removido do fluxo para evitar erros de autenticação com OAuth/keys incompatíveis.
 */

export const OCR_CONFIG = {
  // "auto" = tenta a API OCR.Space quando houver rede e chave configurada.
  // Se não houver API key ou rede, cai em modo demonstração para não quebrar o fluxo.
  provider: "auto" as "auto" | "mock" | "ocrspace" | "custom",

  // Chave gratuita do OCR.Space informada pelo usuário.
  apiKey: "K84712583888957",

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
    case "ocrspace":
      return recognizeWithOcrSpace(await resolveBase64FromCapturedImage(image));
    case "custom":
      return recognizeWithCustomBackend(await resolveBase64FromCapturedImage(image));
    case "auto":
      return recognizeWithAutoMode(image);
    case "mock":
    default:
      return recognizeWithMock();
  }
}

async function resolveBase64FromCapturedImage(image: CapturedImage): Promise<string> {
  if (image.base64 && image.base64.trim().length > 20) {
    return normalizeBase64Data(image.base64);
  }

  if (image.uri && image.uri.trim().length > 0) {
    return await uriToBase64(image.uri);
  }

  throw new Error("Imagem inválida: base64 ou URI ausentes.");
}

function normalizeBase64Data(value: string): string {
  const cleaned = value.replace(/\s+/g, "").trim();
  const match = cleaned.match(/^data:.*;base64,(.*)$/i);
  return (match ? match[1] : cleaned).trim();
}

async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }

  return normalizeBase64Data(`data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`);
}

async function recognizeWithAutoMode(image: CapturedImage): Promise<OcrResult> {
  if (!OCR_CONFIG.apiKey) {
    console.warn("[OCR] API key ausente. Usando modo demonstração.");
    return recognizeWithMock();
  }

  try {
    return await recognizeWithOcrSpace(await resolveBase64FromCapturedImage(image));
  } catch (error) {
    console.error("[OCR] OCR.Space falhou. Usando modo demonstração.", error);
    return recognizeWithMock();
  }
}

async function recognizeWithOcrSpace(base64Image: string): Promise<OcrResult> {
  if (!OCR_CONFIG.apiKey) {
    console.warn("[OCR] OCR_CONFIG.apiKey não configurada, usando modo demonstração.");
    return recognizeWithMock();
  }

  const cleanedBase64 = normalizeBase64Data(base64Image);

  if (!cleanedBase64 || cleanedBase64.length < 20) {
    throw new Error("Imagem em base64 vazia ou inválida para OCR.");
  }

  try {
    const blob = base64ToBlob(cleanedBase64, "image/png");
    const formData = new FormData();
    formData.append("apikey", OCR_CONFIG.apiKey);
    formData.append("language", "por");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("OCREngine", "2");
    formData.append("file", blob, "image.png");

    console.log("[OCR] Enviando imagem para OCR.Space via multipart:", {
      size: cleanedBase64.length,
      apiKeyPrefix: OCR_CONFIG.apiKey.slice(0, 6),
      fileType: blob.type,
    });

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const rawText = await response.text();
    let data: any = {};

    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      console.error("[OCR] OCR.Space respondeu com erro:", {
        status: response.status,
        statusText: response.statusText,
        responseBody: rawText,
      });
      throw new Error(`Falha na requisição de OCR (${response.status})`);
    }

    const text: string = data?.ParsedResults?.[0]?.ParsedText ?? "";
    const errorMessage: string = data?.ErrorMessage?.[0] ?? data?.ErrorMessage ?? "";

    if (errorMessage) {
      console.error("[OCR] OCR.Space retornou erro do serviço:", errorMessage);
      throw new Error(errorMessage);
    }

    if (!text.trim()) {
      console.warn("[OCR] OCR.Space retornou resposta vazia.", data);
      throw new Error("Nenhum texto foi encontrado na imagem.");
    }

    return { text: text.trim() };
  } catch (error) {
    console.error("[OCR] Erro ao chamar OCR.Space.", error);
    throw error;
  }
}

function base64ToBlob(base64: string, mimeType = "image/png"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
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
      "A API OCR.Space não está disponível neste momento; verifique a chave, a rede e a resposta do serviço.",
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

