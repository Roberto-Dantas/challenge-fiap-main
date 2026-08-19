export interface GeneratedSummary {
  title: string;
  content: string;
}

export interface GeneratedExercise {
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

function getGroqApiKey() {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim() ?? "";
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim().replace(/^[-•*]\s*/, ""))
    .filter((sentence) => sentence.length >= 25);
}

function getKeywords(text: string) {
  const stopWords = new Set([
    "a", "as", "ao", "aos", "de", "do", "dos", "da", "das", "e", "em", "é", "era",
    "para", "por", "que", "com", "um", "uma", "uns", "umas", "no", "nos", "na", "nas",
    "se", "sua", "seu", "suas", "seus", "mais", "como", "ou", "dos", "isso", "este", "esta",
  ]);
  const counts = new Map<string, number>();

  normalizeText(text)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-ZÀ-ÿ0-9]+/)
    .forEach((word) => {
      if (word.length >= 5 && !stopWords.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || second[0].length - first[0].length)
    .slice(0, 5)
    .map(([word]) => word);
}

function shorten(sentence: string, maxLength = 180) {
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function generateFallbackSummary(text: string, topicTitle = "Conteúdo estudado"): GeneratedSummary {
  const cleanText = normalizeText(text);
  const sentences = getSentences(cleanText);
  const keywords = getKeywords(cleanText);
  const selectedSentences = (sentences.length > 0 ? sentences : [cleanText]).slice(0, 5);
  const titleKeyword = keywords[0] ? keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1) : topicTitle;

  return {
    title: `Resumo: ${titleKeyword}`,
    content: [
      "Visão geral",
      shorten(selectedSentences[0]),
      "Pontos principais",
      ...selectedSentences.slice(1, 4).map((sentence) => `• ${shorten(sentence, 150)}`),
      keywords.length > 0 ? `Termos para revisar: ${keywords.join(", ")}.` : "Revise as definições e exemplos apresentados no texto.",
    ].join("\n\n"),
  };
}

function generateFallbackExercise(text: string, topicTitle = "este conteúdo"): GeneratedExercise {
  const cleanText = normalizeText(text);
  const sentences = getSentences(cleanText);
  const keywords = getKeywords(cleanText);
  const answer = keywords[0] ?? topicTitle.toLocaleLowerCase("pt-BR");
  const sourceSentence = sentences.find((sentence) => sentence.toLocaleLowerCase("pt-BR").includes(answer)) ?? sentences[0] ?? cleanText;
  const distractors = keywords.slice(1, 4);
  while (distractors.length < 3) distractors.push(`Um detalhe secundário do texto ${distractors.length + 1}`);

  return {
    prompt: `Qual conceito aparece como um dos elementos centrais de ${topicTitle}?`,
    options: [answer, ...distractors],
    correctOption: 0,
    explanation: `O texto destaca “${shorten(sourceSentence, 140)}” como fundamento para compreender o conteúdo.`,
  };
}

export function isUsableAiText(text: string) {
  return normalizeText(text).length >= 25;
}

async function askGroq<T>(systemPrompt: string, userText: string): Promise<T> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("EXPO_PUBLIC_GROQ_API_KEY não configurada");

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq retornou ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Resposta inválida da Groq");
  return JSON.parse(content) as T;
}

export async function generateLocalSummary(text: string, topicTitle = "Conteúdo estudado"): Promise<GeneratedSummary> {
  try {
    const generated = await askGroq<GeneratedSummary>(
      "Você é um professor brasileiro. Gere um resumo didático, fiel e claro. Responda somente JSON válido com title e content. O content deve usar títulos curtos e listas quando ajudarem.",
      `Matéria: ${topicTitle}\nTexto reconhecido por OCR:\n${normalizeText(text)}`,
    );
    if (!generated.title?.trim() || !generated.content?.trim()) throw new Error("Resumo vazio");
    return { title: generated.title.trim(), content: generated.content.trim() };
  } catch (error) {
    console.warn("Groq indisponível; usando geração local", error);
    return generateFallbackSummary(text, topicTitle);
  }
}

export async function generateLocalExercise(text: string, topicTitle = "este conteúdo"): Promise<GeneratedExercise> {
  try {
    const generated = await askGroq<GeneratedExercise>(
      "Você é um professor brasileiro. Crie uma questão de múltipla escolha baseada somente no texto fornecido. Responda somente JSON válido com prompt, options (exatamente 4 strings), correctOption (0 a 3) e explanation. Faça distratores plausíveis.",
      `Matéria: ${topicTitle}\nTexto reconhecido por OCR:\n${normalizeText(text)}`,
    );
    if (!generated.prompt?.trim() || !Array.isArray(generated.options) || generated.options.length !== 4 || generated.correctOption < 0 || generated.correctOption > 3) {
      throw new Error("Exercício inválido");
    }
    return {
      prompt: generated.prompt.trim(),
      options: generated.options.map((option) => option.trim()),
      correctOption: generated.correctOption,
      explanation: generated.explanation?.trim() ?? "",
    };
  } catch (error) {
    console.warn("Groq indisponível; usando geração local", error);
    return generateFallbackExercise(text, topicTitle);
  }
}