"use client";

import { useEffect, useState } from "react";

interface Props {
  file: File;
  selected: Set<number>; // páginas seleccionadas (1-indexed)
  onToggle: (pageNum: number) => void;
  totalPages: number;
  onTotal?: (total: number) => void;
  selectAll?: boolean; // true = extraer (visto), false = eliminar (x)
}

interface PageData {
  num: number;
  url: string;
  width: number;
  height: number;
}

export default function PdfPageSelector({ file, selected, onToggle, totalPages, onTotal, selectAll = false }: Props) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      setLoading(true);
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!(pdfjs as any).GlobalWorkerOptions?.workerSrc) {
          (pdfjs as any).GlobalWorkerOptions.workerSrc =
            new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        }
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        onTotal?.(doc.numPages);
        const items: PageData[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
            items.push({ num: i, url: canvas.toDataURL("image/jpeg", 0.9), width: vp.width, height: vp.height });
          }
        }
        setPages(items);
      } catch (e) {
        console.error("PdfPageSelector error", e);
      } finally {
        setLoading(false);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [file]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 text-neutral-500">
        <span className="animate-pulse">Cargando páginas...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Miniaturas de todas las páginas, separadas en cuadrícula */}
      <div className="flex flex-wrap gap-4 justify-center max-h-[70vh] overflow-y-auto pb-4">
        {pages.map((pg) => {
          const isSel = selected.has(pg.num);
          return (
            <button
              key={pg.num}
              onClick={() => onToggle(pg.num)}
              className={`relative rounded-xl overflow-hidden border-2 transition group ${
                isSel ? (selectAll ? "border-orange-500 bg-orange-500/10" : "border-red-500 bg-red-500/10") : "border-transparent hover:border-orange-500/60"
              }`}
              style={{ width: 140 }}
            >
              <img
                src={pg.url}
                alt={`Página ${pg.num}`}
                className="w-full bg-white"
                style={{ aspectRatio: `${pg.width} / ${pg.height}` }}
              />
              {/* Etiqueta de página */}
              <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold flex items-center justify-center">
                {pg.num}
              </span>
              {/* Overlay según modo */}
              <span className={`absolute inset-0 flex items-center justify-center transition ${isSel ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
                {selectAll ? (
                  <span className={`w-12 h-12 rounded-full flex items-center justify-center ${isSel ? "bg-orange-500" : "bg-orange-500/60"}`}>
                    <span className="text-2xl font-bold text-white">✓</span>
                  </span>
                ) : (
                  <span className={`w-12 h-12 rounded-full flex items-center justify-center ${isSel ? "bg-red-600" : "bg-red-600/60"}`}>
                    <span className="text-2xl font-bold text-white">✕</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm text-neutral-400 mt-4">
        {selected.size === 0
          ? (selectAll ? "Haz clic en las páginas que quieres extraer" : "Haz clic en las páginas que quieres eliminar")
          : `${selected.size} página(s) seleccionada(s): ${Array.from(selected).sort((a, b) => a - b).join(", ")}`}
      </p>
    </div>
  );
}
