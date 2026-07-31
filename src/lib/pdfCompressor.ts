"use client";

import { PDFDocument } from "pdf-lib";

export interface CompressedPdf {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

/**
 * Compress a PDF by re-saving it cleanly.
 * pdf-lib rebuilds the document which:
 *  - removes unused/redundant objects
 *  - strips redundant metadata
 *  - re-encodes with object streams (smaller)
 * This is reliable and cross-browser (no fragile internal node access).
 */
export async function compressPdf(
  file: File,
  _quality: number // kept for API consistency
): Promise<CompressedPdf> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  // Remove existing metadata to shave bytes
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer("");
  pdfDoc.setCreator("");

  const savedBytes = await pdfDoc.save({ useObjectStreams: true });
  const byteArray = new Uint8Array(savedBytes);
  const blob = new Blob([byteArray.buffer], { type: "application/pdf" });

  return {
    blob,
    originalSize: file.size,
    compressedSize: blob.size,
    ratio: blob.size / file.size,
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
