import fs from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { SheetData, Subject } from '../types.js';
import { A4_LANDSCAPE_2UP_HORIZONTAL_V1 as T, mmToPt } from '../template/a4Landscape2upV1.js';
import { allowedChoices } from '../config/assessmentRules.js';
import { barcodePng, createBarcodeToken } from './barcodeService.js';

const subjectLabels: Record<Subject, string> = {
  PORTUGUESE: 'Língua Portuguesa', MATHEMATICS: 'Matemática', SINGLE: 'Prova Única',
};
const timeLabels: Record<SheetData['timeMode'], string> = {
  PARTIAL: 'Parcial', FULL: 'Integral', ALL: 'Parcial e Integral',
};

export const formatSheetSubject = (subject: Subject) => subjectLabels[subject];
export const formatSheetTime = (timeMode: SheetData['timeMode']) => timeLabels[timeMode];
const y = (mm: number) => mmToPt(T.page.height - mm);

function text(page: PDFPage, font: PDFFont, value: string, x: number, top: number, size = 8) {
  page.drawText(value, { x: mmToPt(x), y: y(top) - size, size, font, color: rgb(0, 0, 0) });
}
function centeredText(page: PDFPage, font: PDFFont, value: string, centerX: number, top: number, size = 8) {
  const widthMm = font.widthOfTextAtSize(value, size) * 25.4 / 72;
  text(page, font, value, centerX - widthMm / 2, top, size);
}

async function drawHalf(doc: PDFDocument, page: PDFPage, font: PDFFont, data: SheetData, offset: number, secret: string) {
  const h = T.half;
  for (const marker of h.markers) page.drawRectangle({ x: mmToPt(offset + marker.x - h.markerSize / 2), y: y(marker.y + h.markerSize / 2), width: mmToPt(h.markerSize), height: mmToPt(h.markerSize), color: rgb(0, 0, 0) });
  const token=createBarcodeToken(data.sheetId,secret);
  const image = await doc.embedPng(await barcodePng(token));
  page.drawImage(image, { x: mmToPt(offset + h.barcode.x), y: y(h.barcode.y + h.barcode.height), width: mmToPt(h.barcode.width), height: mmToPt(h.barcode.height) });

  centeredText(page, font, 'GABARITO DE AVALIAÇÃO', offset + 74.25, 13, 9);
  text(page, font, `Código: ${data.sheetId.slice(0,8).toUpperCase()}`, offset + 20, 33, 5.5);
  text(page, font, `Avaliação: ${data.assessmentNumber}  •  ${data.assessmentYear}  •  Disciplina: ${formatSheetSubject(data.subject)}`, offset + 18, 39);
  text(page, font, `Unidade: ${data.unitName}`, offset + 18, 45);
  text(page, font, `Aluno: ${data.studentName ?? '____________________________________'}`, offset + 18, 50);
  text(page, font, `Série: ${data.grade}º   Turma: ${data.className ?? 'Toda a rede'}   Tempo: ${formatSheetTime(data.timeMode)}`, offset + 18, 57);
  page.drawLine({ start: { x: mmToPt(offset + 18), y: y(66) }, end: { x: mmToPt(offset + 130), y: y(66) }, thickness: 0.7 });

  const tableLeft = offset + 18;
  const permittedChoices = allowedChoices(data.grade);
  const permittedBubbles = h.questions[0].bubbles.filter(bubble => permittedChoices.includes(bubble.choice as never));
  const tableRight = offset + permittedBubbles.at(-1)!.x + 7;
  const rows = h.questions.slice(0, data.questionCount);
  const tableBottom = rows.at(-1)!.y + 2.3;
  const gridColor = rgb(0.72, 0.72, 0.72);
  page.drawRectangle({ x: mmToPt(tableLeft), y: y(75.2), width: mmToPt(tableRight - tableLeft), height: mmToPt(7.2), color: rgb(0.94, 0.95, 0.95), borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.45 });
  page.drawRectangle({ x: mmToPt(tableLeft), y: y(tableBottom), width: mmToPt(tableRight - tableLeft), height: mmToPt(tableBottom - 75.2), borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.45 });
  page.drawLine({ start: { x: mmToPt(offset + 31), y: y(68) }, end: { x: mmToPt(offset + 31), y: y(tableBottom) }, thickness: 0.45, color: rgb(0.35, 0.35, 0.35) });
  page.drawLine({ start: { x: mmToPt(offset + 31), y: y(72) }, end: { x: mmToPt(tableRight), y: y(72) }, thickness: 0.3, color: gridColor });
  for (const bubble of permittedBubbles.slice(0, -1)) page.drawLine({ start: { x: mmToPt(offset + bubble.x + 7), y: y(72) }, end: { x: mmToPt(offset + bubble.x + 7), y: y(tableBottom) }, thickness: 0.25, color: gridColor });
  for (const row of rows) page.drawLine({ start: { x: mmToPt(tableLeft), y: y(row.y + 2.3) }, end: { x: mmToPt(tableRight), y: y(row.y + 2.3) }, thickness: 0.25, color: gridColor });
  centeredText(page, font, 'QUESTÃO', offset + 24.5, 69.2, 5.7);
  centeredText(page, font, 'RESPOSTAS', offset + (31 + permittedBubbles.at(-1)!.x + 7) / 2, 68.4, 5.5);
  for (const bubble of permittedBubbles) centeredText(page, font, bubble.choice, offset + bubble.x, 72.2, 6.2);

  for (const row of rows) {
    centeredText(page, font, String(row.question).padStart(2, '0'), offset + 24.5, row.y - 0.1, 7);
    for (const bubble of row.bubbles.filter(item => permittedChoices.includes(item.choice as never))) page.drawCircle({ x: mmToPt(offset + bubble.x), y: y(bubble.y), size: mmToPt(bubble.r), borderWidth: 0.7, borderColor: rgb(0, 0, 0) });
  }
  text(page, font, 'Assinatura do aluno: ______________________________________', offset + 18, 178);
  text(page, font, `${T.id} • ${data.sheetId.slice(0, 8)}`, offset + 18, 195, 5.5);
}

export async function generateAnswerSheetPdf(data: SheetData, secret: string, fontPath?: string) {
  return generateAnswerSheetBatchPdf([data, data], secret, fontPath);
}

export async function generateAnswerSheetBatchPdf(items: SheetData[], secret: string, fontPath?: string) {
  if (!items.length) throw new Error('Nenhuma folha disponível para gerar o PDF.');
  const doc = await PDFDocument.create();
  let font: PDFFont;
  if (fontPath) {
    try { doc.registerFontkit(fontkit); font = await doc.embedFont(await fs.readFile(fontPath), { subset: true }); }
    catch { font = await doc.embedFont(StandardFonts.Helvetica); }
  } else font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < items.length; index += 2) {
    const page = doc.addPage([mmToPt(297), mmToPt(210)]);
    await drawHalf(doc, page, font, items[index], 0, secret);
    if (items[index + 1]) await drawHalf(doc, page, font, items[index + 1], 148.5, secret);
    else centeredText(page, font, 'METADE SEM GABARITO', 222.75, 102, 10);
    page.drawLine({ start: { x: mmToPt(148.5), y: mmToPt(5) }, end: { x: mmToPt(148.5), y: mmToPt(205) }, thickness: 0.6, dashArray: [4, 3], color: rgb(0.4, 0.4, 0.4) });
  }
  return Buffer.from(await doc.save());
}
