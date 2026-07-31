"use client";

import imageCompression from "browser-image-compression";

export interface CompressedImage {
  file: File;
  originalSize: number;
  compressedSize: number;
  ratio: number; // 0-1, lower = more compressed
  type: string;
}

export async function compressImage(
  file: File,
  quality: number // 0.1 - 1
): Promise<CompressedImage> {
  const options = {
    maxSizeMB: 5,
    maxWidthOrHeight: 4000,
    useWebWorker: true,
    initialQuality: quality,
    alwaysKeepResolution: true,
  };

  const compressed = await imageCompression(file, options);
  return {
    file: compressed,
    originalSize: file.size,
    compressedSize: compressed.size,
    ratio: compressed.size / file.size,
    type: compressed.type,
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
