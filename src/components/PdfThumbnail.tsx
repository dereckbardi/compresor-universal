"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfThumbnail({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

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
        const vp = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (ctx) await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
      } catch (e) {
        console.error("PDF thumbnail error", e);
        setError(true);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [file]);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      {error ? (
        <div className="flex flex-col items-center gap-1 text-neutral-400">
          <span className="text-3xl">📄</span>
          <span className="text-[9px] uppercase tracking-wide">PDF</span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
