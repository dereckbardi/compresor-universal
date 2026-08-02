"use client";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Tesseract from "tesseract.js";

export interface OcrResult {
  blobs: Blob[];
  names: string[];
  originalSize: number;
  compressedSize: number;
}

/**
 * OCR PDF: renderiza cada página del PDF a imagen, la reconoce con Tesseract.js
 * y genera un PDF "buscable" (imagen de la página + capa de texto invisible).
 */
export async function ocrPdf(file: File): Promise<OcrResult> {
  const pdfjs = await import("pdfjs-dist");
  if (!(pdfjs as any).GlobalWorkerOptions?.workerSrc) {
    (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL(
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
    await page.render({ canvasContext: ctx, viewport } as any).promise;

    const pngBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/png")
    );
    if (!pngBlob) throw new Error("No se pudo generar la imagen de la página");

    // Reconocimiento de texto (si falla, se continúa sin capa de texto)
    let ocrText = "";
    try {
      const { data: ocr } = await Tesseract.recognize(pngBlob, "spa+eng");
      ocrText = ocr.text || "";
    } catch {
      ocrText = "";
    }

    // Página del PDF de salida (media escala): imagen a página completa + texto invisible
    const w = viewport.width / 2;
    const h = viewport.height / 2;
    const outPage = out.addPage([w, h]);
    const img = await out.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
    outPage.drawImage(img, { x: 0, y: 0, width: w, height: h });

    // Capa de texto invisible (opacity 0) para que el PDF sea buscable/seleccionable
    if (ocrText && ocrText.trim()) {
      outPage.drawText(ocrText.trim().slice(0, 4000), {
        x: 10,
        y: h - 10,
        size: 6,
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
      });
    }
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
