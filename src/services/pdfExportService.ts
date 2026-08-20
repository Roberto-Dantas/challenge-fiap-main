import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { Question } from "../types";

interface PdfHeader {
  subjectTitle: string;
  topicTitle: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br />");
}

function documentTemplate(header: PdfHeader, title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body { color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.55; }
  .brand { color: #2563EB; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
  h1 { color: #0F172A; font-size: 28px; margin: 8px 0 4px; }
  .topic { color: #64748B; font-size: 13px; margin-bottom: 28px; }
  h2 { border-bottom: 2px solid #DBEAFE; color: #1D4ED8; font-size: 18px; padding-bottom: 6px; }
  .summary { border-left: 4px solid #2563EB; margin: 14px 0 22px; padding: 10px 14px; page-break-inside: avoid; }
  .summary-title { color: #0F172A; font-size: 16px; font-weight: 800; margin-bottom: 5px; }
  .question { border: 1px solid #CBD5E1; border-radius: 8px; margin: 14px 0; padding: 14px; page-break-inside: avoid; }
  .question-title { font-weight: 800; margin-bottom: 8px; }
  .option { margin: 4px 0; }
  .answer { color: #047857; font-size: 12px; font-weight: 700; margin-top: 10px; }
  .explanation { color: #475569; font-size: 12px; margin-top: 4px; }
  footer { color: #94A3B8; font-size: 10px; margin-top: 30px; }
</style>
</head>
<body>
  <div class="brand">NOTEZ</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="topic">${escapeHtml(header.subjectTitle)} · ${escapeHtml(header.topicTitle)}</div>
  ${body}
  <footer>Material exportado pelo NoteZ · ${new Date().toLocaleDateString("pt-BR")}</footer>
</body>
</html>`;
}

async function deliverPdf(html: string) {
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }

  const file = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("O compartilhamento não está disponível neste dispositivo.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Exportar PDF" });
}

export async function shareSummaryPdf(header: PdfHeader, summaryTitle: string, content: string) {
  const body = `<h2>Resumo</h2><section class="summary"><div class="summary-title">${escapeHtml(summaryTitle)}</div><div>${escapeHtml(content)}</div></section>`;
  await deliverPdf(documentTemplate(header, summaryTitle, body));
}

export async function shareQuestionPdf(header: PdfHeader, question: Question) {
  const body = `<h2>Exercício</h2><section class="question"><div class="question-title">${escapeHtml(question.prompt)}</div>${question.options.map((option, optionIndex) => `<div class="option">${String.fromCharCode(65 + optionIndex)}) ${escapeHtml(option)}</div>`).join("")}<div class="answer">Resposta: ${String.fromCharCode(65 + question.correctOption)}</div>${question.explanation ? `<div class="explanation">${escapeHtml(question.explanation)}</div>` : ""}</section>`;
  await deliverPdf(documentTemplate(header, "Exercício", body));
}
