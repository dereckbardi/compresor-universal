"use client";

export interface CompressedImage {
  file: File;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  type: string;
}

/**
 * Comprime una imagen respetando su naturaleza:
 * - JPG de entrada -> sale como JPG (igual que antes).
 * - PNG/WebP de entrada -> sale como WebP, que soporta canal alfa (conserva transparencia)
 *   y comprime mucho mejor que PNG. Si el navegador no soporta codificar a WebP,
 *   `canvas.toBlob` cae automáticamente a PNG (sigue conservando transparencia).
 * - GIF animado de entrada -> se detecta y se devuelve SIN modificar. Comprimirlo con
 *   canvas destruiría la animación (canvas solo puede capturar un cuadro). Un GIF estático
 *   (1 solo cuadro) se trata igual que un PNG.
 */
export async function compressImage(
  file: File,
  quality: number // 0.1 - 1
): Promise<CompressedImage> {
  const looksLikeGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
  if (looksLikeGif && (await isAnimatedGif(file))) {
    // No se puede comprimir sin perder la animación: se devuelve intacto.
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      ratio: 1,
      type: file.type || "image/gif",
    };
  }

  const preserveAlpha = file.type === "image/png" || file.type === "image/webp" || looksLikeGif;

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

  const targetType = preserveAlpha ? "image/webp" : "image/jpeg";

  // Probamos con la calidad pedida; si aún es grande, bajamos en pasos.
  let q = quality;
  let blob = await toBlob(canvas, targetType, q);
  // Si el navegador no soporta codificar el tipo pedido, toBlob cae a "image/png"
  // (sin importar el "quality" pasado). En ese caso el bucle de abajo no ayuda, así
  // que lo detectamos y lo saltamos.
  const fellBackToPng = preserveAlpha && blob.type === "image/png";

  const maxTarget = file.size * 0.5; // objetivo: < 50% del original
  if (!fellBackToPng) {
    while (blob.size > maxTarget && q > 0.2) {
      q = Math.max(0.2, q - 0.1);
      blob = await toBlob(canvas, targetType, q);
    }
  }

  const actualType = blob.type || targetType;
  const ext = actualType.split("/")[1] || "jpg";
  const fileName = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  const outFile = new File([blob], fileName, { type: actualType });

  return {
    file: outFile,
    originalSize: file.size,
    compressedSize: blob.size,
    ratio: blob.size / file.size,
    type: actualType,
  };
}

/**
 * Detecta si un GIF tiene más de un cuadro (animado), leyendo su estructura binaria
 * según la especificación GIF89a. Si el archivo no es un GIF válido o algo falla al
 * analizarlo, se asume que NO está animado (comportamiento seguro por defecto).
 */
async function isAnimatedGif(file: File): Promise<boolean> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.length < 13) return false;

    const sig = String.fromCharCode(buf[0], buf[1], buf[2], buf[3], buf[4], buf[5]);
    if (sig !== "GIF87a" && sig !== "GIF89a") return false;

    const screenFlags = buf[10];
    const gctFlag = (screenFlags & 0x80) !== 0;
    const gctSize = gctFlag ? 3 * (1 << ((screenFlags & 0x07) + 1)) : 0;

    let i = 13 + gctSize; // header(6) + logical screen descriptor(7) + tabla global de color
    let frameCount = 0;

    while (i < buf.length) {
      const blockType = buf[i];

      if (blockType === 0x21) {
        // Extension: introductor(1) + label(1) + sub-bloques terminados en 0x00
        i += 2;
        while (i < buf.length && buf[i] !== 0x00) i += buf[i] + 1;
        i += 1;
      } else if (blockType === 0x2c) {
        // Image Descriptor: separador+left+top+w+h+flags = 10 bytes
        frameCount++;
        if (frameCount > 1) return true;
        const packed = buf[i + 9];
        const lctFlag = (packed & 0x80) !== 0;
        const lctSize = lctFlag ? 3 * (1 << ((packed & 0x07) + 1)) : 0;
        i += 10 + lctSize;
        i += 1; // LZW minimum code size
        while (i < buf.length && buf[i] !== 0x00) i += buf[i] + 1;
        i += 1;
      } else {
        // 0x3b (trailer) o cualquier byte inesperado: dejar de analizar.
        break;
      }
    }
    return frameCount > 1;
  } catch {
    return false;
  }
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

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), type, quality);
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
