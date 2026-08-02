"use client";

import { PDFDocument, PDFName, PDFNumber, PDFArray, PDFRawStream } from "pdf-lib";

export interface CompressedPdf {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

/**
 * Comprime un PDF de forma inteligente:
 *
 * - Si el PDF tiene TEXTO REAL (no es un escaneo): se recomprimen SOLO las imágenes
 *   incrustadas dentro del documento (fotos, logos, etc.), dejando el texto intacto:
 *   sigue siendo seleccionable, copiable y buscable después de comprimir.
 *
 * - Si el PDF es un ESCANEO (cada página es efectivamente una foto, sin texto real):
 *   se usa el método anterior — renderizar cada página a una imagen JPEG y volver a
 *   armar el PDF con esas imágenes. Ahí sí tiene sentido porque no había texto que perder.
 */
export async function compressPdf(
  file: File,
  quality: number = 0.7
): Promise<CompressedPdf> {
  const data = new Uint8Array(await file.arrayBuffer());
  const textBased = await isTextBasedPdf(data);

  const result = textBased
    ? await compressPdfImages(data, quality)
    : await rasterizePdf(data, quality);

  // Si el resultado no logró reducir el tamaño, devolvemos el original (nunca empeorar).
  if (!result || result.compressedSize >= file.size) {
    return { blob: file, originalSize: file.size, compressedSize: file.size, ratio: 1 };
  }
  return {
    blob: result.blob,
    originalSize: file.size,
    compressedSize: result.compressedSize,
    ratio: result.compressedSize / file.size,
  };
}

/**
 * Heurística para distinguir un PDF de texto de un escaneo: se mide cuántos
 * caracteres de texto real tienen las primeras páginas. Un escaneo (imagen pura,
 * sin OCR) prácticamente no tiene texto extraíble.
 */
async function isTextBasedPdf(data: Uint8Array): Promise<boolean> {
  try {
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    }
    const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
    const pagesToCheck = Math.min(doc.numPages, 10);
    let totalChars = 0;
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items as { str?: string }[]) {
        totalChars += (item.str || "").length;
      }
    }
    return totalChars / pagesToCheck >= 30;
  } catch {
    // Si algo falla analizando el texto, usamos el método más seguro (rasterizar).
    return false;
  }
}

/**
 * Recomprime solo las imágenes JPEG incrustadas en el PDF, sin tocar el texto ni
 * la estructura del documento. Solo maneja imágenes que ya están en formato JPEG
 * (Filter DCTDecode), que es el caso más común en documentos de Word/Google/Office.
 * Otros formatos de imagen se dejan sin tocar para evitar corromper el archivo.
 */
async function compressPdfImages(
  data: Uint8Array,
  quality: number
): Promise<{ blob: Blob; compressedSize: number } | null> {
  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
  const context = pdfDoc.context;

  const maxDim = quality >= 0.9 ? 2600 : quality >= 0.7 ? 2000 : quality >= 0.4 ? 1500 : 1100;
  const jpegQ = quality >= 0.9 ? 0.8 : quality >= 0.7 ? 0.7 : quality >= 0.4 ? 0.6 : 0.5;

  const SUBTYPE = PDFName.of("Subtype");
  const IMAGE = PDFName.of("Image");
  const FILTER = PDFName.of("Filter");
  const DCT = PDFName.of("DCTDecode");
  const SMASK = PDFName.of("SMask");
  const MASK = PDFName.of("Mask");
  const WIDTH = PDFName.of("Width");
  const HEIGHT = PDFName.of("Height");
  const COLORSPACE = PDFName.of("ColorSpace");
  const DEVICE_RGB = PDFName.of("DeviceRGB");
  const BPC = PDFName.of("BitsPerComponent");
  const DECODEPARMS = PDFName.of("DecodeParms");
  const DECODE = PDFName.of("Decode");

  const entries = context.enumerateIndirectObjects();
  for (const [ref, obj] of entries) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(SUBTYPE) !== IMAGE) continue;

    // No tocamos imágenes con transparencia: re-codificarlas a JPEG perdería el
    // canal alfa y cambiaría cómo se ve la página.
    if (dict.has(SMASK) || dict.has(MASK)) continue;

    const filter = dict.get(FILTER);
    const isDct =
      filter === DCT || (filter instanceof PDFArray && filter.size() === 1 && filter.get(0) === DCT);
    if (!isDct) continue; // Solo manejamos imágenes ya en JPEG (el caso más común).

    const rawBytes = obj.getContents();
    if (rawBytes.length < 20_000) continue; // Ya es pequeña, no vale la pena tocarla.

    try {
      const recompressed = await recompressJpeg(rawBytes, maxDim, jpegQ);
      if (!recompressed || recompressed.bytes.length >= rawBytes.length) continue; // no mejoró

      const newDict = dict.clone(context);
      newDict.set(WIDTH, PDFNumber.of(recompressed.width));
      newDict.set(HEIGHT, PDFNumber.of(recompressed.height));
      newDict.set(COLORSPACE, DEVICE_RGB);
      newDict.set(BPC, PDFNumber.of(8));
      newDict.set(FILTER, DCT);
      newDict.delete(DECODEPARMS);
      newDict.delete(DECODE);

      const newStream = PDFRawStream.of(newDict, recompressed.bytes);
      context.assign(ref, newStream);
    } catch {
      // Si algo falla con esta imagen puntual, la dejamos como estaba y seguimos.
      continue;
    }
  }

  const saved = await pdfDoc.save({ useObjectStreams: true });
  return {
    blob: new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" }),
    compressedSize: saved.length,
  };
}

/** Decodifica una imagen JPEG cruda, la reescala si excede maxDim, y la re-codifica. */
async function recompressJpeg(
  bytes: Uint8Array,
  maxDim: number,
  jpegQ: number
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
  const bitmap = await loadBitmap(blob);
  if (!bitmap) return null;

  const srcW = "width" in bitmap ? bitmap.width : 0;
  const srcH = "height" in bitmap ? bitmap.height : 0;
  if (!srcW || !srcH) return null;

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);

  const outBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", jpegQ)
  );
  if (!outBlob) return null;

  const outBytes = new Uint8Array(await outBlob.arrayBuffer());
  return { bytes: outBytes, width: w, height: h };
}

/** Carga una imagen (ImageBitmap si está disponible, si no <img> como respaldo). */
async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // sigue al respaldo de <img> abajo
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/**
 * Método para PDFs escaneados: renderiza cada página a una imagen JPEG y arma
 * un PDF nuevo con esas imágenes. Reduce el peso a costa de que el texto (si lo
 * hubiera) deje de ser seleccionable — aceptable porque un escaneo no tenía texto
 * real de por sí.
 */
async function rasterizePdf(
  data: Uint8Array,
  quality: number
): Promise<{ blob: Blob; compressedSize: number } | null> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  const srcDoc = await pdfjs.getDocument({ data }).promise;
  const outDoc = await PDFDocument.create();

  const scale = quality >= 0.9 ? 1.2 : quality >= 0.7 ? 1.0 : quality >= 0.4 ? 0.8 : 0.65;
  const jpegQ = quality >= 0.9 ? 0.75 : quality >= 0.7 ? 0.68 : quality >= 0.4 ? 0.6 : 0.5;

  for (let i = 1; i <= srcDoc.numPages; i++) {
    const page = await srcDoc.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
    const jpgBytes = await new Promise<Uint8Array | null>((resolve) => {
      canvas.toBlob(async (b) => {
        if (!b) return resolve(null);
        resolve(new Uint8Array(await b.arrayBuffer()));
      }, "image/jpeg", jpegQ);
    });
    if (!jpgBytes) continue;
    const jpg = await outDoc.embedJpg(jpgBytes);
    const pw = vp.width, ph = vp.height;
    const pg = outDoc.addPage([pw, ph]);
    pg.drawImage(jpg, { x: 0, y: 0, width: pw, height: ph });
  }
  const saved = await outDoc.save({ useObjectStreams: true });
  return {
    blob: new Blob([saved.buffer as ArrayBuffer], { type: "application/pdf" }),
    compressedSize: saved.length,
  };
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
