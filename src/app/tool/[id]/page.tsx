"use client";

import { use, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOOLS } from "@/lib/tools";
import { compressPdf } from "@/lib/pdfCompressor";
import { compressImage, formatBytes, formatPercent } from "@/lib/imageCompressor";
import {
  mergePdfs, splitPdf, removePages, extractPages, rotatePdf,
  imagesToPdf, pdfToJpg, PdfResult,
} from "@/lib/pdfOps";

export default function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const tool = useMemo(() => TOOLS.find((t) => t.id === id), [id]);

  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<PdfResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // tool-specific options
  const [pagesInput, setPagesInput] = useState("");
  const [password, setPassword] = useState("");
  const [rotateDeg, setRotateDeg] = useState(90);
  const [quality, setQuality] = useState(0.7);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!tool || !tool.available) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Herramienta no disponible</h1>
        <p className="text-neutral-400">Esta herramienta está marcada como "Pronto".</p>
        <Link href="/tools" className="px-6 py-3 rounded-xl bg-orange-500 text-black font-semibold">Volver a herramientas</Link>
      </main>
    );
  }

  const accept = tool.category === "a-pdf" && tool.id === "jpg-pdf"
    ? "image/*"
    : tool.id === "merge"
    ? "application/pdf"
    : "application/pdf";

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setResult(null); setError(null);
    const arr = Array.from(list);
    setFiles((prev) => (tool.id === "merge" || tool.id === "jpg-pdf" ? [...prev, ...arr] : arr));
  }, [tool.id]);

  const parsePages = (): number[] => {
    const nums = pagesInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
    return nums;
  };

  const run = async () => {
    if (!files.length) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      let r: PdfResult;
      switch (tool.id) {
        case "compress":
          if (files[0].type === "application/pdf") {
            const c = await compressPdf(files[0], quality);
            r = { blobs: [c.blob], names: [files[0].name.replace(/\.[^.]+$/, "") + "-comprimido.pdf"], originalSize: c.originalSize, compressedSize: c.compressedSize };
          } else {
            const c = await compressImage(files[0], quality);
            r = { blobs: [c.file], names: [files[0].name.replace(/\.[^.]+$/, "") + "-comprimido." + (c.file.type.split("/")[1] || "jpg")], originalSize: c.originalSize, compressedSize: c.compressedSize };
          }
          break;
        case "merge": r = await mergePdfs(files); break;
        case "split": r = await splitPdf(files[0]); break;
        case "remove": {
          const pages = parsePages(); if (!pages.length) throw new Error("Escribe las páginas a eliminar (ej: 1,3,5)");
          r = await removePages(files[0], pages); break;
        }
        case "extract": {
          const pages = parsePages(); if (!pages.length) throw new Error("Escribe las páginas a extraer (ej: 1,3,5)");
          r = await extractPages(files[0], pages); break;
        }
        case "rotate": r = await rotatePdf(files[0], rotateDeg); break;
        case "jpg-pdf": r = await imagesToPdf(files); break;
        case "pdf-jpg": r = await pdfToJpg(files[0]); break;
        default: throw new Error("Herramienta en desarrollo");
      }
      setResult(r);
    } catch (e: any) {
      setError(e.message || "Error al procesar el archivo");
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    if (!result) return;
    result.blobs.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.names[i]; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const totalRatio = result ? result.compressedSize / result.originalSize : 0;

  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-orange-500/30">
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-black text-sm">C</span>
            <span className="font-semibold tracking-widest text-sm">COMPRIMEME</span>
          </Link>
          <Link href="/tools" className="text-sm text-neutral-400 hover:text-white transition">← Todas las herramientas</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-3xl mx-auto mb-4">{tool.icon}</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{tool.name}</h1>
          <p className="text-neutral-400">{tool.desc}</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-orange-500 bg-orange-500/5" : "border-neutral-700 hover:border-neutral-500 bg-neutral-900/30"}`}
        >
          <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <div className="text-4xl mb-3">{tool.icon}</div>
          <p className="text-lg font-medium mb-1">Seleccionar archivo{tool.id === "merge" || tool.id === "jpg-pdf" ? "s" : ""}</p>
          <p className="text-sm text-neutral-500">o arrastra y suelta aquí</p>
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div className="mt-4 bg-neutral-900 rounded-xl p-4 border border-white/5">
            <ul className="text-sm space-y-1 max-h-32 overflow-auto">
              {files.map((f, i) => (
                <li key={i} className="flex justify-between text-neutral-300"><span className="truncate pr-3">📎 {f.name}</span><span className="text-neutral-500">{formatBytes(f.size)}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Tool-specific options */}
        {(tool.id === "compress") && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <div className="flex justify-between mb-2"><span className="text-sm text-neutral-400">Calidad</span><span className="text-sm font-semibold text-orange-500">{Math.round(quality * 100)}%</span></div>
            <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-full accent-orange-500" />
          </div>
        )}

        {(tool.id === "remove" || tool.id === "extract") && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <label className="text-sm text-neutral-400 block mb-2">{tool.id === "remove" ? "Páginas a eliminar" : "Páginas a extraer"} (separadas por coma)</label>
            <input value={pagesInput} onChange={(e) => setPagesInput(e.target.value)} placeholder="ej: 1,3,5" className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
          </div>
        )}

        {tool.id === "rotate" && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <label className="text-sm text-neutral-400 block mb-2">Ángulo de rotación</label>
            <div className="flex gap-2">
              {[90, 180, 270].map((d) => (
                <button key={d} onClick={() => setRotateDeg(d)} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${rotateDeg === d ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{d}°</button>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-7 text-center">
          <button onClick={run} disabled={!files.length || processing} className="w-full sm:w-auto px-12 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-lg text-black transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98]">
            {processing ? "⏳ Procesando..." : `🧊 ${tool.name}`}
          </button>
        </div>

        {error && (
          <div className="mt-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">{error}</div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8">
            <div className="bg-neutral-900 border border-emerald-500/20 rounded-xl p-4 mb-4 text-center">
              <p className="text-neutral-400">
                {formatBytes(result.originalSize)} → <span className="text-emerald-400 font-semibold">{formatBytes(result.compressedSize)}</span>
                {result.compressedSize < result.originalSize && <span className="text-emerald-500 font-bold ml-2">{formatPercent(totalRatio)}</span>}
              </p>
              <p className="text-xs text-neutral-500 mt-1">{result.names.length} archivo(s) generado(s)</p>
            </div>
            <div className="flex justify-center gap-3">
              {result.blobs.length === 1 && (
                <button onClick={downloadAll} className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold transition">⬇️ Descargar</button>
              )}
              {result.blobs.length > 1 && (
                <button onClick={downloadAll} className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold transition">⬇️ Descargar todos ({result.names.length})</button>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-xs text-neutral-600">
          <p>COMPRIMEME — 100% local y gratuito. Tus archivos nunca salen de tu dispositivo.</p>
        </div>
      </footer>
    </main>
  );
}
