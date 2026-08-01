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

/** Extract each of the given pages into SEPARATE PDFs (one PDF per page) */
export async function extractEachPage(file: File, pages: number[], fileLabel = ""): Promise<PdfResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const blobs: Blob[] = [];
  const names: string[] = [];
  const prefix = fileLabel || file.name.replace(/\.pdf$/i, "");
  let total = 0;
  for (const p of pages) {
    const doc = await PDFDocument.create();
    const [copy] = await doc.copyPages(src, [p - 1]);
    doc.addPage(copy);
    const bytes = await doc.save({ useObjectStreams: true });
    total += bytes.length;
    blobs.push(bytesToBlob(bytes, `${prefix}-pagina-${p}.pdf`));
    names.push(`${prefix}-pagina-${p}.pdf`);
  }
  return { blobs, names, originalSize: file.size, compressedSize: total };
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
export async function pdfToJpg(file: File, scale = 1.5, fileLabel = ""): Promise<PdfResult> {
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
  const prefix = fileLabel || file.name.replace(/\.pdf$/i, "");

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
      names.push(`${prefix}-pagina-${i}.jpg`);
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

/** Extract all embedded images from a PDF and convert them to JPG blobs */
export async function extractImagesFromPdf(file: File, fileLabel = ""): Promise<PdfResult> {
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
  let count = 0;
  const prefix = fileLabel || file.name.replace(/\.pdf$/i, "");
  const OPS = (pdfjs as any).OPS;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    for (let o = 0; o < ops.fnArray.length; o++) {
      const fn = ops.fnArray[o];
      if (fn !== OPS.paintImageXObject && fn !== OPS.paintInlineImageXObject && fn !== OPS.paintImageMaskXObject) continue;
      let img;
      try {
        if (fn === OPS.paintImageXObject) {
          const imgName = ops.argsArray[o][0];
          if (typeof imgName !== "string") continue;
          img = await page.objs.get(imgName);
        } else {
          // Inline o mask: datos directos en args
          const arg = ops.argsArray[o][0];
          if (arg && typeof arg === "object" && arg.width) img = arg;
        }
      } catch {
        continue;
      }
      if (!img || !img.width || !img.height) continue;

      // Extraer bytes: pdf.js devuelve img.data que puede ser Uint8Array o objeto decodificado {buffer, length}
      let bytes: Uint8Array | null = null;
      try {
        if (img.data instanceof Uint8Array) {
          bytes = img.data;
        } else if (img.data && typeof img.data === "object" && img.data.buffer) {
          const arr = img.data.buffer;
          if (arr instanceof Uint8Array) bytes = arr;
          else if (arr instanceof ArrayBuffer) bytes = new Uint8Array(arr);
        } else if (img.bitmap) {
          // Si pdf.js ya decodificó a ImageBitmap
          const canvas2 = document.createElement("canvas");
          canvas2.width = img.width;
          canvas2.height = img.height;
          canvas2.getContext("2d")?.drawImage(img.bitmap, 0, 0);
          const b2 = await new Promise<Blob | null>((resolve) => canvas2.toBlob((b) => resolve(b), "image/jpeg", 0.92));
          if (b2) {
            count++;
            total += b2.size;
            blobs.push(b2);
            names.push(`${prefix}-imagen-${count}.jpg`);
          }
          continue;
        }
      } catch {
        bytes = null;
      }
      if (!bytes) continue;

      count++;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      try {
        const kind = (img as any).kind;
        const mime = kind === 3 ? "image/jpeg" : "image/png";
        const blob = new Blob([bytes as any], { type: mime });
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await createImageBitmap(blob);
        } catch {
          // crearImageBitmap no soportado para este formato -> intentar via Image
          try {
            bitmap = await new Promise<ImageBitmap | null>((resolve) => {
              const im = new Image();
              const url = URL.createObjectURL(blob);
              im.onload = () => {
                const c = document.createElement("canvas");
                c.width = im.width;
                c.height = im.height;
                c.getContext("2d")?.drawImage(im, 0, 0);
                URL.revokeObjectURL(url);
                resolve(c as unknown as ImageBitmap);
              };
              im.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
              im.src = url;
            });
          } catch {
            bitmap = null;
          }
        }
        if (bitmap) ctx.drawImage(bitmap as any, 0, 0);
        const outBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
        if (outBlob) {
          total += outBlob.size;
          blobs.push(outBlob);
          names.push(`${prefix}-imagen-${count}.jpg`);
        }
      } catch {
        continue;
      }
    }
  }
  if (!blobs.length) {
    // Fallback: renderizar las páginas a JPG (útil para PDFs cuyas imágenes no se detectan por operador)
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
      if (blob) {
        total += blob.size;
        blobs.push(blob);
        names.push(`${prefix}-pagina-${p}.jpg`);
      }
    }
  }
  if (!blobs.length) throw new Error("No se encontraron imágenes extraíbles en este PDF");
  return { blobs, names, originalSize: file.size, compressedSize: total };
}
