"use client";

import { useCallback, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ToolTransition, HeroFade, ResultPop } from "@/components/animations";
import { compressImage, formatBytes, formatPercent, CompressedImage } from "@/lib/imageCompressor";
import { compressPdf, CompressedPdf } from "@/lib/pdfCompressor";
import {
  mergePdfs, splitPdf, removePages, extractPages, rotatePdf,
  imagesToPdf, pdfToJpg, PdfResult,
} from "@/lib/pdfOps";

type Mode = "image" | "pdf" | "merge" | "split" | "pdf-jpg" | "rotate" | "extract" | "remove" | "jpg-pdf";

interface Result {
  name: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  blob: Blob;
}

const NAV: { id: Mode; label: string }[] = [
  { id: "image", label: "Imágenes" },
  { id: "pdf", label: "PDF" },
  { id: "merge", label: "Unir" },
  { id: "split", label: "Dividir" },
  { id: "pdf-jpg", label: "PDF a JPG" },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("image");
  const [quality, setQuality] = useState(0.7);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pagesInput, setPagesInput] = useState("");
  const [rotateDeg, setRotateDeg] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMulti = mode === "merge" || mode === "jpg-pdf";
  const isImageInput = mode === "image" || mode === "jpg-pdf";
  const acceptedExt = isImageInput ? "image/*" : "application/pdf";

  const titles: Record<Mode, { title: string; desc: string }> = {
    image: { title: "Comprime tus imágenes", desc: "Reduce el peso de tus imágenes sin perder calidad, ideal para compartirlas más rápido." },
    pdf: { title: "Comprime tus PDF", desc: "Reduce el peso de tu PDF para que pese menos y sea más fácil de enviar, sin perder calidad." },
    merge: { title: "Unir PDF", desc: "Combina varios PDF en un solo archivo, en el orden que quieras. Perfecto para juntar documentos." },
    split: { title: "Dividir PDF", desc: "Extrae una o varias páginas de tu PDF, o convierte cada página del PDF en un archivo PDF independiente." },
    "pdf-jpg": { title: "PDF a JPG", desc: "Convierte cada página de tu PDF en una imagen JPG independiente, lista para compartir." },
    rotate: { title: "Rotar PDF", desc: "Gira todas las páginas de tu PDF 90°, 180° o 270° para corregir su orientación." },
    extract: { title: "Extraer páginas", desc: "Guarda solo las páginas específicas de tu PDF en un documento nuevo, sin tocar el original." },
    remove: { title: "Eliminar páginas", desc: "Quita las páginas que no necesitas de tu PDF y deja solo las que te interesan." },
    "jpg-pdf": { title: "JPG a PDF", desc: "Convierte tus imágenes en un PDF, perfecto para documentos escaneados o fotos." },
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setFiles([]);
    setResults([]);
    setError(null);
    setPagesInput("");
  };

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setError(null);
    setResults([]);
    const arr = Array.from(list);
    setFiles((prev) => (isMulti ? [...prev, ...arr] : arr));
  }, [isMulti]);

  const parsePages = (): number[] =>
    pagesInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);

  const run = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setResults([]);
    try {
      let r: PdfResult;
      switch (mode) {
        case "image": {
          const out: Result[] = [];
          for (const file of files) {
            const c: CompressedImage = await compressImage(file, quality);
            out.push({
              name: file.name.replace(/\.[^.]+$/, "") + "-comprimido." + (c.file.type.split("/")[1] || "jpg"),
              originalSize: c.originalSize, compressedSize: c.compressedSize,
              ratio: c.ratio, blob: c.file,
            });
          }
          setResults(out); setProcessing(false); return;
        }
        case "pdf": {
          const c: CompressedPdf = await compressPdf(files[0], quality);
          r = { blobs: [c.blob], names: [files[0].name.replace(/\.[^.]+$/, "") + "-comprimido.pdf"], originalSize: c.originalSize, compressedSize: c.compressedSize };
          break;
        }
        case "merge": r = await mergePdfs(files); break;
        case "split": r = await splitPdf(files[0]); break;
        case "pdf-jpg": r = await pdfToJpg(files[0]); break;
        case "rotate": r = await rotatePdf(files[0], rotateDeg); break;
        case "extract": {
          const pages = parsePages(); if (!pages.length) throw new Error("Escribe las páginas a extraer (ej: 1,3,5)");
          r = await extractPages(files[0], pages); break;
        }
        case "remove": {
          const pages = parsePages(); if (!pages.length) throw new Error("Escribe las páginas a eliminar (ej: 1,3,5)");
          r = await removePages(files[0], pages); break;
        }
        case "jpg-pdf": r = await imagesToPdf(files); break;
        default: return;
      }
      const out: Result[] = r.blobs.map((blob, i) => ({
        name: r.names[i], originalSize: r.originalSize, compressedSize: r.compressedSize,
        ratio: r.compressedSize / r.originalSize, blob,
      }));
      setResults(out);
    } catch (e: any) {
      setError(e.message || "Error al procesar el archivo");
    } finally {
      setProcessing(false);
    }
  };

  const download = (r: Result) => {
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement("a");
    a.href = url; a.download = r.name; a.click();
    URL.revokeObjectURL(url);
  };

  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalCompressed = results.reduce((s, r) => s + r.compressedSize, 0);
  const t = titles[mode];

  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-black text-sm">C</span>
            <span className="font-semibold tracking-widest text-sm hidden sm:block">COMPRIMEME</span>
          </div>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => switchMode(n.id)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap transition ${mode === n.id ? "text-orange-500" : "text-neutral-400 hover:text-white"}`}
              >
                {n.label}
              </button>
            ))}
            <a href="/tools" className="btn-shine ml-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition whitespace-nowrap">
              Todas las herramientas
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 py-14 sm:py-16">
        <HeroFade>
          <div className="text-center mb-10">
            <motion.h1
              key={`title-${mode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            >
              {t.title}
            </motion.h1>
            <motion.p
              key={`desc-${mode}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-neutral-400 max-w-xl mx-auto text-lg"
            >
              {t.desc}
            </motion.p>
          </div>
        </HeroFade>

        {/* Drop zone */}
        <ToolTransition mode={`zone-${mode}`}>
        <motion.div
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-colors duration-200 ${dragOver ? "border-orange-500 bg-orange-500/5" : "border-neutral-700 hover:border-neutral-500 bg-neutral-900/30"}`}
        >
          <input ref={inputRef} type="file" multiple accept={acceptedExt} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <div className="mb-5 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl">
              {mode === "image" ? "🖼️" : mode === "jpg-pdf" ? "📄" : "📄"}
            </div>
          </div>
          <p className="text-xl font-medium mb-2">Seleccionar archivo{isMulti ? "s" : ""}</p>
          <p className="text-sm text-neutral-500">o arrastra y suelta aquí</p>
          <p className="text-xs text-neutral-600 mt-3">
            {isImageInput ? "JPG, PNG, WebP, GIF" : "Solo PDF"}
          </p>
        </motion.div>
        </ToolTransition>

        {/* Files */}
        {files.length > 0 && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-neutral-400">{files.length} archivo(s) seleccionado(s)</p>
              <button onClick={() => setFiles([])} className="text-xs text-neutral-500 hover:text-red-400 transition">Limpiar</button>
            </div>
            <ul className="space-y-2 max-h-44 overflow-auto">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                  <span className="truncate pr-3 flex items-center gap-2"><span className="text-neutral-600">📎</span> {f.name}</span>
                  <span className="text-neutral-500 shrink-0">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tool options */}
        {(mode === "image" || mode === "pdf") && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-neutral-400">Calidad de compresión</span>
              <span className="text-sm font-semibold text-orange-500">{Math.round(quality * 100)}%</span>
            </div>
            <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-full accent-orange-500" />
            <div className="flex justify-between text-xs text-neutral-600 mt-2"><span>Máxima</span><span>Balanceado</span><span>Calidad</span></div>
          </div>
        )}

        {(mode === "extract" || mode === "remove") && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <label className="text-sm text-neutral-400 block mb-2">{mode === "remove" ? "Páginas a eliminar" : "Páginas a extraer"} (separadas por coma)</label>
            <input value={pagesInput} onChange={(e) => setPagesInput(e.target.value)} placeholder="ej: 1,3,5" className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
          </div>
        )}

        {mode === "rotate" && (
          <div className="mt-5 bg-neutral-900 rounded-xl p-5 border border-white/5">
            <label className="text-sm text-neutral-400 block mb-2">Ángulo de rotación</label>
            <div className="flex gap-2">
              {[90, 180, 270].map((d) => (
                <button key={d} onClick={() => setRotateDeg(d)} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${rotateDeg === d ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{d}°</button>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        <div className="mt-7 text-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={run}
            disabled={!files.length || processing}
            className="w-full sm:w-auto px-12 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-lg text-black transition-colors hover:shadow-lg hover:shadow-orange-500/25"
          >
            {processing ? "⏳ Procesando..." : `🧊 ${t.title}`}
          </motion.button>
        </div>

        {error && (
          <div className="mt-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">{error}</div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-neutral-900 border border-emerald-500/20 rounded-xl p-4 mb-4 text-center"
            >
              <p className="text-neutral-400">
                Total: <span className="text-white">{formatBytes(totalOriginal)}</span> → <span className="text-emerald-400 font-semibold">{formatBytes(totalCompressed)}</span>
                {totalCompressed < totalOriginal && <span className="text-emerald-500 font-bold ml-2">{formatPercent(totalCompressed / totalOriginal)}</span>}
              </p>
              <p className="text-xs text-neutral-500 mt-1">{results.length} archivo(s) generado(s)</p>
            </motion.div>
            <ul className="space-y-3">
              {results.map((r, i) => (
                <ResultPop key={i} index={i}>
                  <li className="bg-neutral-900 rounded-xl p-4 flex items-center justify-between border border-white/5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-sm text-neutral-500">{formatBytes(r.originalSize)} → <span className="text-emerald-400">{formatBytes(r.compressedSize)}</span> {r.compressedSize < r.originalSize && <span className="text-emerald-500 font-semibold">{formatPercent(r.ratio)}</span>}</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => download(r)} className="ml-4 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-sm font-semibold shrink-0 transition-colors">⬇️ Descargar</motion.button>
                  </li>
                </ResultPop>
              ))}
            </ul>
            {results.length > 1 && (
              <div className="mt-4 flex justify-center">
                <button onClick={() => results.forEach(download)} className="px-6 py-2.5 rounded-lg border border-orange-500/50 text-orange-500 hover:bg-orange-500/10 font-medium transition">⬇️ Descargar todos</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-neutral-600">
          <p>COMPRIMEME — 100% gratis y sin registro.</p>
        </div>
      </footer>
    </main>
  );
}
