"use client";

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import Tesseract from "tesseract.js";

export interface OcrResult {
  blobs: Blob[];
  names: string[];
  originalSize: number;
  compressedSize: number;
}

/**
 * OCR PDF: renderiza cada página a imagen, reconoce el texto con Tesseract.js
 * palabra por palabra (con su posición real) y genera un PDF "buscable": la
 * imagen visible + una capa de texto invisible colocada EN EL MISMO LUGAR
 * donde está cada palabra en la página. Así, seleccionar o copiar texto da
 * resultados alineados con el documento original, en vez de un bloque de
 * texto desordenado pegado en una sola esquina.
 */
export async function ocrPdf(file: File): Promise<OcrResult> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const scale = 2; // resolución del render (calidad del OCR)
  const totalPages = doc.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });

    // Render de la página a canvas
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el lienzo para el OCR");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const pngBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/png")
    );
    if (!pngBlob) throw new Error("No se pudo generar la imagen de la página");

    // Reconocimiento de texto palabra por palabra, con su posición (bbox) en
    // la imagen. Si falla, se continúa sin capa de texto (la página sigue
    // siendo legible como imagen, solo que no será buscable).
    let words: Tesseract.Word[] = [];
    try {
      const { data: ocrPage } = await Tesseract.recognize(pngBlob, "spa+eng");
      words = extractWords(ocrPage);
    } catch {
      words = [];
    }

    // Página de salida al tamaño real del PDF original (viewport / scale).
    const w = viewport.width / scale;
    const h = viewport.height / scale;
    const outPage = out.addPage([w, h]);
    const img = await out.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
    outPage.drawImage(img, { x: 0, y: 0, width: w, height: h });

    drawInvisibleTextLayer(outPage, words, font, scale);
  }

  const bytes = await out.save({ useObjectStreams: true });
  const base = file.name.replace(/\.pdf$/i, "") || "documento";
  const name = `${base}-ocr.pdf`;
  return {
    blobs: [new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" })],
    names: [name],
    originalSize: file.size,
    compressedSize: bytes.length,
  };
}

/** Aplana la estructura de Tesseract (bloques > párrafos > líneas > palabras) a una lista simple. */
function extractWords(ocrPage: Tesseract.Page): Tesseract.Word[] {
  const words: Tesseract.Word[] = [];
  for (const block of ocrPage.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          words.push(word);
        }
      }
    }
  }
  return words;
}

/**
 * Dibuja cada palabra reconocida como texto invisible en la posición exacta
 * donde aparece en la imagen de la página. La imagen tiene origen arriba-a-la
 * -izquierda (Y crece hacia abajo); el PDF tiene origen abajo-a-la-izquierda
 * (Y crece hacia arriba), por eso se invierte el eje Y al convertir.
 */
function drawInvisibleTextLayer(
  outPage: PDFPage,
  words: Tesseract.Word[],
  font: PDFFont,
  scale: number
) {
  const pageHeight = outPage.getHeight();
  for (const word of words) {
    const text = (word.text || "").trim();
    if (!text || word.confidence < 30) continue;

    const { x0, y0, x1, y1 } = word.bbox;
    const boxW = (x1 - x0) / scale;
    const boxH = (y1 - y0) / scale;
    if (boxW <= 0 || boxH <= 0) continue;

    const x = x0 / scale;
    const y = pageHeight - y1 / scale;
    const fontSize = Math.max(4, boxH * 0.9);

    try {
      outPage.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
      });
    } catch {
      // Un carácter no soportado por la fuente no debe tumbar todo el proceso;
      // simplemente se omite esa palabra puntual y se sigue con las demás.
      continue;
    }
  }
}
