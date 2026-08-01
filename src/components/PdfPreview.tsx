"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfPreview({ file, page = 1 }: { file: File | Blob; page?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      setError(false);
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!(pdfjs as any).GlobalWorkerOptions?.workerSrc) {
          (pdfjs as any).GlobalWorkerOptions.workerSrc =
            new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        }
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        const pg = await doc.getPage(page);
        const vp = pg.getViewport({ scale: 1.4 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (ctx) await pg.render({ canvasContext: ctx, viewport: vp } as any).promise;
      } catch (e) {
        console.error("PDF preview error", e);
        setError(true);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [file, page]);

  if (error) {
    return <div className="w-full h-96 bg-neutral-900/60 rounded-xl border border-white/10 flex items-center justify-center text-neutral-500 text-sm">No se pudo mostrar el PDF</div>;
  }

  return (
    <div className="pdf-scroll flex justify-center w-full max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-neutral-800/40 p-3">
      <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg bg-white shadow-lg" style={{ maxHeight: "65vh" }} />
    </div>
  );
}
