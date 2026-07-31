"use client";

import { PDFDocument, degrees } from "pdf-lib";

export interface PdfResult {
  blobs: Blob[];
  names: string[];
  originalSize: number;
  compressedSize: number;
}

function bytesToBlob(bytes: Uint8Array, name: string): Blob {
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/** Merge multiple PDFs into one */
export async function mergePdfs(files: File[]): Promise<PdfResult> {
  const merged = await PDFDocument.create();
  let total = 0;
  for (const file of files) {
    total += file.size;
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const bytes = await merged.save({ useObjectStreams: true });
  return {
    blobs: [bytesToBlob(bytes, "unido.pdf")],
    names: ["unido.pdf"],
    originalSize: total,
    compressedSize: bytes.length,
  };
}

/** Split a PDF into one PDF per page */
export async function splitPdf(file: File): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const count = src.getPageCount();
  const blobs: Blob[] = [];
  const names: string[] = [];
  let totalBytes = 0;
  for (let i = 0; i < count; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    const bytes = await doc.save({ useObjectStreams: true });
    totalBytes += bytes.length;
    blobs.push(bytesToBlob(bytes, `pagina-${i + 1}.pdf`));
    names.push(`pagina-${i + 1}.pdf`);
  }
  return { blobs, names, originalSize: file.size, compressedSize: totalBytes };
}

/** Remove specific pages (1-indexed array) */
export async function removePages(file: File, pagesToRemove: number[]): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const count = src.getPageCount();
  const removeSet = new Set(pagesToRemove.map((p) => p - 1)); // 0-indexed
  const keep = src.getPageIndices().filter((i) => !removeSet.has(i));
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, keep);
  pages.forEach((p) => doc.addPage(p));
  const bytes = await doc.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "sin-paginas.pdf")], names: ["sin-paginas.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Extract specific pages (1-indexed array) into a new PDF */
export async function extractPages(file: File, pages: number[]): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const idx = pages.map((p) => p - 1);
  const doc = await PDFDocument.create();
  const copy = await doc.copyPages(src, idx);
  copy.forEach((p) => doc.addPage(p));
  const bytes = await doc.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "extraidas.pdf")], names: ["extraidas.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Rotate all pages by degrees (90/180/270) */
export async function rotatePdf(file: File, deg: number): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const pages = src.getPages();
  pages.forEach((p) => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
  const bytes = await src.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "rotado.pdf")], names: ["rotado.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Convert images to a single PDF */
export async function imagesToPdf(files: File[]): Promise<PdfResult> {
  const doc = await PDFDocument.create();
  let total = 0;
  for (const file of files) {
    total += file.size;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let img;
    if (file.type === "image/png") img = await doc.embedPng(bytes);
    else img = await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const out = await doc.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(out, "imagenes.pdf")], names: ["imagenes.pdf"], originalSize: total, compressedSize: out.length };
}

/** Convert PDF pages to JPG images (renders via canvas) */
export async function pdfToJpg(file: File, scale = 1.5): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist");
  if (!(pdfjs as any).GlobalWorkerOptions?.workerSrc) {
    (pdfjs as any).GlobalWorkerOptions.workerSrc = 
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const blobs: Blob[] = [];
  const names: string[] = [];
  let total = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const renderCtx: any = { canvasContext: ctx, viewport };
    await page.render(renderCtx).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
    if (blob) {
      total += blob.size;
      blobs.push(blob);
      names.push(`pagina-${i}.jpg`);
    }
  }
  if (!blobs.length) throw new Error("No se pudieron renderizar las páginas");
  return { blobs, names, originalSize: file.size, compressedSize: total };
}
