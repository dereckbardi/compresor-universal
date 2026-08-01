"use client";

export interface CompressedImage {
  file: File;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  type: string;
}

// Comprimir con canvas para control total: siempre reduce
export async function compressImage(
  file: File,
  quality: number // 0.1 - 1
): Promise<CompressedImage> {
  const img = await loadImage(file);
  // Resolución máxima según calidad (menos calidad = menos resolución)
  const maxW = Math.max(700, Math.round(3500 * (0.4 + quality * 0.6)));
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  // Probamos con la calidad pedida; si aún es grande, bajamos en pasos
  let q = quality;
  let blob = await toBlob(canvas, q);
  const maxTarget = file.size * 0.5; // objetivo: < 50% del original
  while (blob.size > maxTarget && q > 0.2) {
    q = Math.max(0.2, q - 0.1);
    blob = await toBlob(canvas, q);
  }

  const fileName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const outFile = new File([blob], fileName, { type: "image/jpeg" });

  return {
    file: outFile,
    originalSize: file.size,
    compressedSize: blob.size,
    ratio: blob.size / file.size,
    type: "image/jpeg",
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), "image/jpeg", quality);
  });
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
