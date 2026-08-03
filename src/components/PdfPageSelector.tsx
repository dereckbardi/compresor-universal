"use client";

import { useEffect, useState } from "react";
import { Check, X } from "@phosphor-icons/react";

interface Props {
  file: File;
  selected: Set<number>; // páginas seleccionadas (1-indexed)
  onToggle: (pageNum: number) => void;
  totalPages: number;
  onTotal?: (total: number) => void;
  selectAll?: boolean; // true = extraer (visto), false = eliminar (x)
  ranges?: { start: number; end: number }[]; // para agrupar páginas por rango (modo dividir)
}

interface PageData {
  num: number;
  url: string;
  width: number;
  height: number;
}

export default function PdfPageSelector({ file, selected, onToggle, totalPages, onTotal, selectAll = false, ranges = [] }: Props) {
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

  // Función: a qué rango pertenece una página (para el modo dividir)
  const rangeOf = (num: number): number => {
    for (let i = 0; i < ranges.length; i++) {
      if (num >= ranges[i].start && num <= ranges[i].end) return i;
    }
    return -1;
  };

  // Colores para distinguir rangos
  const rangeColors = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308", "#ef4444", "#14b8a6", "#ec4899"];

  // Agrupar por rangos. Solo mostramos las páginas que pertenecen a un rango.
  const grouped = ranges.length > 0 ? ranges.map((rg) => pages.filter((pg) => pg.num >= rg.start && pg.num <= rg.end)) : null;

  return (
    <div className="w-full">
      {grouped ? (
        /* Vista agrupada por rangos (solo lo agrupado) */
        <div className="pdf-scroll space-y-5 max-h-[70vh] overflow-y-auto pb-4">
          {grouped.map((group, gi) => group.length > 0 && (
            <div key={gi} className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: rangeColors[gi % rangeColors.length] }}>
                Rango {gi + 1} · páginas {group[0].num} a {group[group.length - 1].num}
              </p>
              <div className="flex flex-wrap gap-3">
                {group.map((pg) => (
                  <PageThumb key={pg.num} pg={pg} borderColor={rangeColors[gi % rangeColors.length]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vista normal (cuadrícula) */
        <div className="pdf-scroll flex flex-wrap gap-4 justify-center max-h-[70vh] overflow-y-auto pb-4">
          {pages.map((pg) => (
            <button
              key={pg.num}
              onClick={() => onToggle(pg.num)}
              className={`relative rounded-xl overflow-hidden border-2 transition group ${
                selected.has(pg.num) ? (selectAll ? "border-orange-500 bg-orange-500/10" : "border-red-500 bg-red-500/10") : "border-transparent hover:border-orange-500/60"
              }`}
              style={{ width: 140 }}
            >
              <img src={pg.url} alt={`Página ${pg.num}`} className="w-full bg-white" style={{ aspectRatio: `${pg.width} / ${pg.height}` }} />
              <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold flex items-center justify-center">{pg.num}</span>
              <span className={`absolute inset-0 flex items-center justify-center transition ${selected.has(pg.num) ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
                {selectAll ? (
                  <span className={`w-12 h-12 rounded-full flex items-center justify-center ${selected.has(pg.num) ? "bg-orange-500" : "bg-orange-500/60"}`}>
                    <Check size={28} weight="bold" className="text-white" />
                  </span>
                ) : (
                  <span className={`w-12 h-12 rounded-full flex items-center justify-center ${selected.has(pg.num) ? "bg-red-600" : "bg-red-600/60"}`}>
                    <X size={28} weight="bold" className="text-white" />
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-4">
        {selected.size === 0
          ? (selectAll ? "Haz clic en las páginas que quieres extraer" : ranges.length > 0 ? "" : "Haz clic en las páginas que quieres eliminar")
          : `${selected.size} página(s) seleccionada(s): ${Array.from(selected).sort((a, b) => a - b).join(", ")}`}
      </p>
    </div>
  );
}

function PageThumb({ pg, borderColor }: { pg: PageData; borderColor: string | null }) {
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ width: 110, border: borderColor ? `2px solid ${borderColor}` : "2px solid #3f3f46" }}>
      <img src={pg.url} alt={`Página ${pg.num}`} className="w-full bg-white" style={{ aspectRatio: `${pg.width} / ${pg.height}` }} />
      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center justify-center">{pg.num}</span>
    </div>
  );
}
