"use client";

import { useEffect, useRef, useState } from "react";
import { CopySimple, X } from "@phosphor-icons/react";

interface Props {
  file: File;
  signature?: string; // dataUrl de la firma
  signPos?: { x: number; y: number; w: number };
  signPage?: number; // página actual de la firma
  onSignMove?: (pos: { x: number; y: number; w: number }) => void;
  onSignPage?: (page: number) => void;
  onSignRemove?: () => void;
  onSignCopy?: () => void;
}

export default function PdfFullViewer({ file, signature, signPos, signPage, onSignMove, onSignPage, onSignRemove, onSignCopy }: Props) {
  const [pages, setPages] = useState<{ dataUrl: string; w: number; h: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.5);
  const [current, setCurrent] = useState(0);
  const [activePage, setActivePage] = useState(0); // página donde se está moviendo la firma
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<{ type: "move" | "resize"; startX: number; startY: number; origX: number; origY: number; origW: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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
        const rendered: { dataUrl: string; w: number; h: number }[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
            rendered.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.9), w: canvas.width, h: canvas.height });
          }
        }
        setPages(rendered);
        setCurrent(rendered.length - 1);
        setActivePage(rendered.length - 1);
        onSignPage?.(rendered.length - 1);
      } catch (e) {
        console.error("PdfFullViewer error", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [file]);

  if (loading) {
    return <div className="flex justify-center items-center py-20 text-neutral-500"><span className="animate-pulse">Cargando PDF...</span></div>;
  }

  // Manejar arrastre de la firma dentro de la página activa
  const handleSignDown = (e: React.PointerEvent, type: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    (target as any).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX: signPos?.x ?? 0,
      origY: signPos?.y ?? 0,
      origW: signPos?.w ?? 120,
    };
  };

  const handleSignMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !onSignMove) return;
    const pageEl = pageRefs.current[activePage];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const scaleW = pages[activePage] ? pageEl.clientWidth / pages[activePage].w : 1;
    const dx = (e.clientX - d.startX) / scaleW;
    const dy = (e.clientY - d.startY) / scaleW;
    if (d.type === "move") {
      onSignMove({ x: d.origX + dx, y: d.origY + dy, w: d.origW });
    } else {
      onSignMove({ x: d.origX, y: d.origY, w: Math.max(40, d.origW + dx) });
    }
  };

  const handleSignUp = () => { dragRef.current = null; };

  return (
    <div className="w-full flex gap-4">
      {/* Miniaturas */}
      <div className="pdf-scroll w-20 shrink-0 max-h-[75vh] overflow-y-auto space-y-2 rounded-xl border border-white/10 bg-neutral-900/60 p-2">
        {pages.map((pg, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); setActivePage(i); onSignPage?.(i); document.getElementById(`sig-page-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            className={`relative w-full rounded-lg overflow-hidden border-2 transition ${i === current ? "border-orange-500" : "border-transparent hover:border-orange-500/50"}`}
          >
            <img src={pg.dataUrl} alt={`Página ${i + 1}`} className="w-full bg-white" />
            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Páginas completas */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-neutral-400">{pages.length} página(s) · elige una página con las miniaturas y coloca tu firma</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setScale((s) => Math.max(0.8, +(s - 0.2).toFixed(2)))} className="w-8 h-8 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 text-lg">−</button>
            <span className="w-16 text-center text-xs text-neutral-400">{Math.round(scale * 62.5)}%</span>
            <button onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))} className="w-8 h-8 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 text-lg">+</button>
          </div>
        </div>
        <div className="pdf-scroll max-h-[75vh] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-neutral-900/60 p-4 space-y-4">
          {pages.map((pg, pi) => {
            const showSign = signature && signPage === pi;
            return (
              <div key={pi} id={`sig-page-${pi}`} ref={(el) => { pageRefs.current[pi] = el; }} className="relative mx-auto" style={{ maxWidth: 900 }}>
                <img src={pg.dataUrl} alt={`Página ${pi + 1}`} className="w-full h-auto rounded-lg pointer-events-none" />
                {showSign && (
                  <div
                    className="absolute"
                    style={{ left: (signPos?.x ?? 0) * (pageRefs.current[pi] ? pageRefs.current[pi].clientWidth / pages[pi].w : 1), top: (signPos?.y ?? 0) * (pageRefs.current[pi] ? pageRefs.current[pi].clientWidth / pages[pi].w : 1), width: (signPos?.w ?? 120) * (pageRefs.current[pi] ? pageRefs.current[pi].clientWidth / pages[pi].w : 1) }}
                  >
                    <div className="relative group">
                      <img
                        src={signature}
                        alt="Firma"
                        className="w-full select-none cursor-grab active:cursor-grabbing"
                        draggable={false}
                        onPointerDown={(e) => handleSignDown(e, "move")}
                        onPointerMove={handleSignMove}
                        onPointerUp={handleSignUp}
                      />
                      {/* Controles: copiar, eliminar, redimensionar */}
                      <div className="absolute -top-8 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={onSignCopy} className="w-6 h-6 rounded-md bg-neutral-800 border border-white/20 text-[11px] text-white hover:bg-neutral-700" title="Copiar firma"><CopySimple size={11} weight="bold" /></button>
                        <button onClick={onSignRemove} className="w-6 h-6 rounded-md bg-red-600 border border-red-400 text-[11px] text-white hover:bg-red-500" title="Eliminar firma"><X size={11} weight="bold" /></button>
                      </div>
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white rounded-full cursor-nwse-resize"
                        onPointerDown={(e) => handleSignDown(e, "resize")}
                        onPointerMove={handleSignMove}
                        onPointerUp={handleSignUp}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
