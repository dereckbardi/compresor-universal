"use client";

import { PDFDocument } from "pdf-lib";

export interface CompressedPdf {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

/**
 * Compress a PDF by rendering pages at high resolution and re-encoding to JPEG.
 * High scale keeps text legible; JPEG compresses images effectively.
 * This gives real size reduction (unlike metadata-stripping).
 */
export async function compressPdf(
  file: File,
  quality: number = 0.7
): Promise<CompressedPdf> {
  const pdfjs = await import("pdfjs-dist");
  if (!(pdfjs as any).GlobalWorkerOptions?.workerSrc) {
    (pdfjs as any).GlobalWorkerOptions.workerSrc =
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await pdfjs.getDocument({ data }).promise;
  const { PDFDocument } = await import("pdf-lib");
  const outDoc = await PDFDocument.create();

  // Escala según calidad: 1x mantiene tamaño, menor escala reduce más
  const scale = quality >= 0.9 ? 1.2 : quality >= 0.7 ? 1.0 : quality >= 0.4 ? 0.8 : 0.65;
  const jpegQ = quality >= 0.9 ? 0.75 : quality >= 0.7 ? 0.68 : quality >= 0.4 ? 0.6 : 0.5;

  let totalBytes = 0;
  for (let i = 1; i <= srcDoc.numPages; i++) {
    const page = await srcDoc.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
    const jpgBytes = await new Promise<Uint8Array | null>((resolve) => {
      canvas.toBlob(async (b) => {
        if (!b) return resolve(null);
        resolve(new Uint8Array(await b.arrayBuffer()));
      }, "image/jpeg", jpegQ);
    });
    if (!jpgBytes) continue;
    totalBytes += jpgBytes.length;
    const jpg = await outDoc.embedJpg(jpgBytes);
    const pw = vp.width, ph = vp.height;
    const pg = outDoc.addPage([pw, ph]);
    pg.drawImage(jpg, { x: 0, y: 0, width: pw, height: ph });
  }
  const saved = await outDoc.save({ useObjectStreams: true });
  const blob = new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" });
  const result = { blob, originalSize: file.size, compressedSize: blob.size, ratio: blob.size / file.size };

  // Si el render NO redujo, devolver el PDF original (sin empeorar)
  if (result.compressedSize >= file.size) {
    return { blob: file, originalSize: file.size, compressedSize: file.size, ratio: 1 };
  }
  return result;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatPercent(ratio: number): string {
  const reduction = (1 - ratio) * 100;
  return reduction > 0 ? `-${reduction.toFixed(0)}%` : `+${Math.abs(reduction).toFixed(0)}%`;
}
