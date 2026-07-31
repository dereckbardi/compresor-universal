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

// Page sizes in points (1 pt = 1/72 inch)
const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
};

const MARGINS: Record<string, number> = {
  none: 0,
  small: 24,
  large: 48,
};

interface ImgToPdfOpts {
  pageSize?: string;
  orientation?: "portrait" | "landscape";
  margin?: string;
  unify?: boolean;
}

/** Convert images to PDF(s). unify=true -> one PDF with all images; false -> one PDF per image. */
export async function imagesToPdf(files: File[], opts: ImgToPdfOpts = {}): Promise<PdfResult> {
  const { pageSize = "A4", orientation = "portrait", margin = "none", unify = true } = opts;
  let [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  if (orientation === "landscape") { const t = pw; pw = ph; ph = t; }
  const m = MARGINS[ margin ] ?? MARGINS.none;
  let total = files.reduce((s, f) => s + f.size, 0);

  const blobs: Blob[] = [];
  const names: string[] = [];

  if (unify) {
    const doc = await PDFDocument.create();
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const img = file.type === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const aspect = img.width / img.height;
      const availW = pw - 2 * m, availH = ph - 2 * m;
      let w = availW, h = availW / aspect;
      if (h > availH) { h = availH; w = h * aspect; }
      const page = doc.addPage([pw, ph]);
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    const out = await doc.save({ useObjectStreams: true });
    blobs.push(bytesToBlob(out, "imagenes.pdf"));
    names.push("imagenes.pdf");
  } else {
    for (const file of files) {
      const doc = await PDFDocument.create();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const img = file.type === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const aspect = img.width / img.height;
      const availW = pw - 2 * m, availH = ph - 2 * m;
      let w = availW, h = availW / aspect;
      if (h > availH) { h = availH; w = h * aspect; }
      const page = doc.addPage([pw, ph]);
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      const out = await doc.save({ useObjectStreams: true });
      blobs.push(bytesToBlob(out, file.name.replace(/\.[^.]+$/, "") + ".pdf"));
      names.push(file.name.replace(/\.[^.]+$/, "") + ".pdf");
    }
  }

  return { blobs, names, originalSize: total, compressedSize: blobs.reduce((s, b) => s + b.size, 0) };
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

/** Add a text watermark to all pages */
export async function addWatermark(file: File, text: string, opts: { opacity?: number; size?: number; diagonal?: boolean } = {}): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const { opacity = 0.2, size = 40, diagonal = true } = opts;
  const font = await src.embedFont(await import("pdf-lib").then(m => m.StandardFonts.Helvetica));
  const pages = src.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - (text.length * size * 0.3) / 2,
      y: height / 2 - size / 2,
      size,
      font,
      opacity,
      rotate: diagonal ? degrees(45) : degrees(0),
      color: (await import("pdf-lib")).rgb(1, 1, 1),
    });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "con-marca-de-agua.pdf")], names: ["con-marca-de-agua.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Add page numbers to all pages */
export async function addPageNumbers(file: File, position: "bottom" | "top" = "bottom"): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await src.embedFont((await import("pdf-lib")).StandardFonts.Helvetica);
  const pages = src.getPages();
  const count = pages.length;
  for (let i = 0; i < count; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const num = `${i + 1} / ${count}`;
    const size = 10;
    page.drawText(num, {
      x: width / 2 - (num.length * size * 0.3) / 2,
      y: position === "bottom" ? 15 : height - 25,
      size,
      font,
      color: (await import("pdf-lib")).rgb(0.5, 0.5, 0.5),
    });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "con-numeros.pdf")], names: ["con-numeros.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Add a signature image at a position */
export async function addSignature(file: File, imageFile: File, position: "bottom-right" | "bottom-left" | "center" = "bottom-right"): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const imgBytes = new Uint8Array(await imageFile.arrayBuffer());
  const img = imageFile.type === "image/png" ? await src.embedPng(imgBytes) : await src.embedJpg(imgBytes);
  const pages = src.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const iw = Math.min(img.width, width * 0.25);
    const ih = (img.height / img.width) * iw;
    let x = width - iw - 30, y = 30;
    if (position === "bottom-left") { x = 30; y = 30; }
    else if (position === "center") { x = width / 2 - iw / 2; y = height / 2 - ih / 2; }
    page.drawImage(img, { x, y, width: iw, height: ih });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "firmado.pdf")], names: ["firmado.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Redact (black-out) areas on all pages - here: a bar at top and bottom */
export async function redactPdf(file: File): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const { rgb } = await import("pdf-lib");
  const pages = src.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - 40, width, height: 40, color: rgb(0, 0, 0) });
    page.drawRectangle({ x: 0, y: 0, width, height: 40, color: rgb(0, 0, 0) });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "censurado.pdf")], names: ["censurado.pdf"], originalSize: file.size, compressedSize: bytes.length };
}

/** Crop all pages to a region given as fractions (0-1) of the page. crop = {x, y, w, h} with origin bottom-left. */
export async function cropPdf(file: File, crop: { x: number; y: number; w: number; h: number }): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const pages = src.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const x = crop.x * width;
    const y = crop.y * height;
    const w = crop.w * width;
    const h = crop.h * height;
    page.setCropBox(x, y, x + w, y + h);
    page.setMediaBox(x, y, x + w, y + h);
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { blobs: [bytesToBlob(bytes, "recortado.pdf")], names: ["recortado.pdf"], originalSize: file.size, compressedSize: bytes.length };
}
