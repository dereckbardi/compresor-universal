"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  file: File;
  mode: "watermark" | "page-num" | "redact" | "crop" | "rotate";
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkColor?: [number, number, number];
  numPosition?: "bottom" | "top";
  crop?: { l: number; t: number; r: number; b: number };
  rotateDeg?: number;
}

export default function PdfLivePreview({ file, mode, watermarkText = "CONFIDENCIAL", watermarkOpacity = 0.2, watermarkColor = [1, 1, 1], numPosition = "bottom", crop = { l: 5, t: 5, r: 5, b: 5 }, rotateDeg = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageSize, setPageSize] = useState({ w: 595, h: 842 });
  const [aspect, setAspect] = useState(595 / 842);
  // Guardamos la imagen de la página para poder redibujarla sin borrarla
  const pageBitmapRef = useRef<ImageBitmap | null>(null);

  // Render primera página con pdf.js
  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!(pdfjs as any).GlobalWorkerOptions?.workerSrc) {
          (pdfjs as any).GlobalWorkerOptions.workerSrc =
            new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        }
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        const page = await doc.getPage(1);
        const vp = page.getViewport({ scale: 1.2 });
        setPageSize({ w: vp.width, h: vp.height });
        setAspect(vp.width / vp.height);
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
        // Guardar la imagen renderizada para redibujarla después
        try {
          pageBitmapRef.current = await createImageBitmap(canvas);
        } catch {
          pageBitmapRef.current = null;
        }
      } catch (e) {
        console.error("PDF preview error", e);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [file]);

  // Overlay: primero redibuja la página guardada, luego el efecto
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = pageSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Redibujar la página base (evita que se ponga en blanco)
    if (pageBitmapRef.current) {
      ctx.drawImage(pageBitmapRef.current, 0, 0, canvas.width, canvas.height);
    }
    ctx.save();

    if (mode === "rotate") {
      // Rotación manejada por CSS en el contenedor
    }

    if (mode === "watermark") {
      const size = Math.min(w, h) * 0.09;
      ctx.globalAlpha = watermarkOpacity;
      ctx.fillStyle = `rgb(${Math.round(watermarkColor[0] * 255)}, ${Math.round(watermarkColor[1] * 255)}, ${Math.round(watermarkColor[2] * 255)})`;
      ctx.font = `bold ${size}px Arial`;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(watermarkText || "", 0, 0);
    }

    if (mode === "page-num") {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = `${Math.min(w, h) * 0.02}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const y = numPosition === "bottom" ? h * 0.04 : h * 0.95;
      ctx.fillText("1 / N", w / 2, y);
    }

    if (mode === "redact") {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h * 0.05);
      ctx.fillRect(0, h - h * 0.05, w, h * 0.05);
    }

    if (mode === "crop") {
      const { l, t, r, b } = crop;
      const x = (l / 100) * w;
      const y = (b / 100) * h;
      const cw = ((100 - l - r) / 100) * w;
      const ch = ((100 - t - b) / 100) * h;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, y);
      ctx.fillRect(0, y + ch, w, h - y - ch);
      ctx.fillRect(0, y, x, ch);
      ctx.fillRect(x + cw, y, w - x - cw, ch);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cw, ch);
    }

    ctx.restore();
  }, [mode, watermarkText, watermarkOpacity, watermarkColor, numPosition, crop, pageSize, rotateDeg]);

  const previewH = 300;
  const isRotate = mode === "rotate";
  const rot = rotateDeg; // rotación acumulada, sin módulo (para que gire continuamente)
  const boxStyle: React.CSSProperties = isRotate
    ? {
        width: previewH * aspect,
        height: previewH,
        transform: `rotate(${rot}deg)`,
        transition: "transform 0.3s ease",
      }
    : { width: previewH * aspect, height: previewH };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative rounded-lg overflow-hidden border border-white/10 shadow-xl bg-white ${isRotate ? "m-10" : ""}`}
        style={boxStyle}
      >
        <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
