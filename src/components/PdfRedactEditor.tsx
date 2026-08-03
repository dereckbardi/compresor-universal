"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, EnvelopeSimple, Lightbulb, Phone } from "@phosphor-icons/react";

interface RedactSelection {
  page: number; // 0-indexed
  x: number; y: number; w: number; h: number;
}

interface Props {
  file: File;
  onRects?: (rects: RedactSelection[]) => void;
}

export default function PdfRedactEditor({ file, onRects }: Props) {
  const [pages, setPages] = useState<any[]>([]); // {dataUrl, w, h}
  const [textItems, setTextItems] = useState<any[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.6);
  const [current, setCurrent] = useState(0); // página seleccionada
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<RedactSelection[]>([]);
  const [redacts, setRedacts] = useState<RedactSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispW, setDispW] = useState<number[]>([]); // ancho real mostrado por página
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  // Selección manual por arrastre
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        const rendered: any[] = [];
        const items: any[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const vp = page.getViewport({ scale: 1 });
          const hvp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(hvp.width);
          canvas.height = Math.floor(hvp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: hvp } as any).promise;
            rendered.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.9), w: canvas.width, h: canvas.height });
          }
          const content = await page.getTextContent();
          for (const raw of content.items) {
            const item = raw as any;
            if (!item.str || !item.transform) continue;
            const tx = item.transform[4];
            const ty = item.transform[5];
            const w = item.width;
            const h = item.height || 12;
            items.push({ str: item.str, page: p - 1, x: tx * scale, y: (vp.height - ty - h) * scale, w: w * scale, h: h * scale });
          }
        }
        setPages(rendered);
        setTextItems(items);
        setNumPages(doc.numPages);
      } catch (e) {
        console.error("Redact load error", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [file]);

  const findText = (q: string) => {
    setQuery(q);
    const found: RedactSelection[] = [];
    if (!q.trim()) { setMatches([]); return; }
    const needle = q.toLowerCase();
    for (const item of textItems) {
      if (item.str.toLowerCase().includes(needle)) {
        found.push({ page: item.page, x: item.x, y: item.y, w: item.w, h: item.h });
      }
    }
    setMatches(found);
  };

  const applyMatches = () => {
    setRedacts((prev) => {
      const merged = [...prev];
      for (const m of matches) {
        if (!merged.some((r) => r.page === m.page && Math.abs(r.x - m.x) < 3 && Math.abs(r.y - m.y) < 3)) merged.push(m);
      }
      return merged;
    });
    setMatches([]);
    setQuery("");
  };

  const detectCategory = (type: string) => {
    const found: RedactSelection[] = [];
    for (const item of textItems) {
      const s = item.str;
      let ok = false;
      if (type === "tarjeta") ok = /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/.test(s) || /\d{13,19}/.test(s.replace(/\s/g, ""));
      else if (type === "telefono") ok = /\+?\d[\d\s()-]{6,}/.test(s);
      else if (type === "email") ok = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s);
      if (ok) found.push({ page: item.page, x: item.x, y: item.y, w: item.w, h: item.h });
    }
    setRedacts((prev) => {
      const merged = [...prev];
      for (const m of found) {
        if (!merged.some((r) => r.page === m.page && Math.abs(r.x - m.x) < 3 && Math.abs(r.y - m.y) < 3)) merged.push(m);
      }
      return merged;
    });
  };

  useEffect(() => {
    if (onRects && redacts.length) {
      onRects(redacts.map((r) => ({ page: r.page, x: r.x / scale, y: r.y / scale, w: r.w / scale, h: r.h / scale })));
    }
  }, [redacts]);

  if (loading) {
    return <div className="flex justify-center items-center py-20 text-neutral-500"><span className="animate-pulse">Cargando PDF...</span></div>;
  }

  const isRedacted = (pageIdx: number, x: number, y: number) =>
    redacts.some((r) => r.page === pageIdx && Math.abs(r.x - x) < 3 && Math.abs(r.y - y) < 3);
  const isMatched = (pageIdx: number, x: number, y: number) =>
    matches.some((m) => m.page === pageIdx && Math.abs(m.x - x) < 3 && Math.abs(m.y - y) < 3);

  // Proporción para escalar coordenadas del canvas al ancho real mostrado
  const displayScale = (pi: number) => {
    const w = dispW[pi];
    const pg = pages[pi];
    return pg && w ? w / pg.w : 1;
  };
  const pageRects = redacts.filter((r) => r.page === current);
  const pageMatches = matches.filter((m) => m.page === current);


  return (
    <div className="w-full flex flex-col lg:flex-row gap-4">
      {/* Barra lateral de miniaturas */}
      <div className="pdf-scroll w-20 shrink-0 max-h-[75vh] overflow-y-auto space-y-2 rounded-xl border border-white/10 bg-neutral-900/60 p-2">
        {pages.map((pg, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrent(i);
              const el = document.getElementById(`page-${i}`);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`relative w-full rounded-lg overflow-hidden border-2 transition ${i === current ? "border-orange-500" : "border-transparent hover:border-orange-500/50"}`}
          >
            <img src={pg.dataUrl} alt={`Página ${i + 1}`} className="w-full bg-white" />
            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Visor central: TODAS las páginas en scroll vertical continuo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-neutral-400">{numPages} página(s) · desplázate para ver todo</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setScale((s) => Math.max(0.8, +(s - 0.2).toFixed(2)))} className="w-8 h-8 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 text-lg">−</button>
            <span className="w-16 text-center text-xs text-neutral-400">{Math.round(scale * 62.5)}%</span>
            <button onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))} className="w-8 h-8 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 text-lg">+</button>
          </div>
        </div>

        <div className="pdf-scroll max-h-[75vh] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-neutral-900/60 p-4 space-y-4">
          {pages.map((pg, pi) => (
            <div
              key={pi}
              id={`page-${pi}`}
              ref={(el) => { containerRef.current = el; }}
              className="relative w-full mx-auto"
              style={{ maxWidth: 900, cursor: "crosshair", userSelect: "none" }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setDragging(true);
                setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                setDragRect(null);
              }}
              onMouseMove={(e) => {
                if (!dragging || !dragStart) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                setDragRect({
                  x: Math.min(dragStart.x, cx),
                  y: Math.min(dragStart.y, cy),
                  w: Math.abs(cx - dragStart.x),
                  h: Math.abs(cy - dragStart.y),
                });
              }}
              onMouseUp={(e) => {
                if (!dragging || !dragRect) { setDragging(false); setDragStart(null); setDragRect(null); return; }
                const ds = displayScale(pi);
                if (dragRect.w > 4 && dragRect.h > 4) {
                  setRedacts((prev) => [...prev, {
                    page: pi,
                    x: dragRect.x / ds,
                    y: dragRect.y / ds,
                    w: dragRect.w / ds,
                    h: dragRect.h / ds,
                  }]);
                }
                setDragging(false); setDragStart(null); setDragRect(null);
              }}
              onMouseLeave={() => { if (dragging) { setDragging(false); setDragStart(null); setDragRect(null); } }}
            >
              <img
                ref={(el) => { imgRefs.current[pi] = el; }}
                src={pg.dataUrl}
                alt={`Página ${pi + 1}`}
                className="w-full h-auto rounded-lg pointer-events-none"
                onLoad={(e) => {
                  const w = (e.currentTarget as HTMLImageElement).clientWidth;
                  setDispW((prev) => { const n = [...prev]; n[pi] = w; return n; });
                }}
              />
              {textItems.filter((t) => t.page === pi).map((t, ti) => {
                const isR = isRedacted(pi, t.x, t.y);
                const isM = isMatched(pi, t.x, t.y);
                if (!isR && !isM) return null;
                const ds = displayScale(pi);
                return (
                  <div
                    key={ti}
                    className={`absolute rounded-[2px] ${isR ? "bg-black" : "bg-orange-500/70 outline outline-2 outline-orange-400"}`}
                    style={{ left: t.x * ds, top: t.y * ds, width: t.w * ds, height: t.h * ds, cursor: "pointer" }}
                    title={t.str}
                    onClick={() => {
                      if (isR) setRedacts(redacts.filter((r) => !(r.page === pi && Math.abs(r.x - t.x) < 3)));
                    }}
                  />
                );
              })}
              {/* Rectángulo de arrastre en vivo (solo en la página actual) */}
              {dragRect && pi === current && (
                <div
                  className="absolute bg-black/70 border-2 border-orange-500 rounded-[2px] pointer-events-none"
                  style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panel de censura */}
      <div className="w-full lg:w-56 lg:shrink-0 space-y-3">
        <div>
          <label className="text-sm text-neutral-400 block mb-2">Buscar texto</label>
          <input
            value={query}
            onChange={(e) => findText(e.target.value)}
            placeholder="Escribe la palabra..."
            className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={applyMatches}
            disabled={!matches.length}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black text-sm font-semibold transition"
          >
            Censurar ({matches.length})
          </button>
        </div>

        <div>
          <label className="text-xs text-neutral-500 block mb-2">O detectar:</label>
          <div className="space-y-2">
            {[
              { type: "tarjeta", label: <><CreditCard size={14} className="inline-block align-[-2px] mr-1.5" /> Tarjeta crédito</> },
              { type: "telefono", label: <><Phone size={14} className="inline-block align-[-2px] mr-1.5" /> Teléfono</> },
              { type: "email", label: <><EnvelopeSimple size={14} className="inline-block align-[-2px] mr-1.5" /> Email</> },
            ].map((c) => (
              <button
                key={c.type}
                onClick={() => detectCategory(c.type)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 hover:text-white text-xs font-medium transition"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          {redacts.length > 0 ? `${redacts.length} marcado(s). Clic en uno para quitarlo.` : "Sin elementos marcados."}
        </p>
        <p className="text-[11px] text-neutral-600"><Lightbulb size={12} weight="fill" className="inline-block align-[-2px] mr-1" /> Arrastra el cursor sobre cualquier zona del PDF (incluidas imágenes) para censurarla manualmente.</p>
      </div>
    </div>
  );
}
