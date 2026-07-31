"use client";

import { useCallback, useState, useRef } from "react";
import { compressImage, formatBytes, formatPercent, CompressedImage } from "@/lib/imageCompressor";
import { compressPdf, CompressedPdf } from "@/lib/pdfCompressor";

type FileType = "image" | "pdf";

interface Result {
  name: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  type: string;
  blob: Blob;
}

export default function Home() {
  const [fileType, setFileType] = useState<FileType>("image");
  const [quality, setQuality] = useState(0.7);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedExt = fileType === "image" ? "image/*" : "application/pdf";

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).filter((f) =>
      fileType === "image" ? f.type.startsWith("image/") : f.type === "application/pdf"
    );
    if (arr.length) setFiles((prev) => [...prev, ...arr]);
  }, [fileType]);

  const compress = async () => {
    if (!files.length) return;
    setProcessing(true);
    setResults([]);
    try {
      const out: Result[] = [];
      for (const file of files) {
        if (fileType === "image") {
          const r: CompressedImage = await compressImage(file, quality);
          out.push({
            name: file.name.replace(/\.[^.]+$/, "") + "-comprimido." + (r.file.type.split("/")[1] || "jpg"),
            originalSize: r.originalSize,
            compressedSize: r.compressedSize,
            ratio: r.ratio,
            type: r.type,
            blob: r.file,
          });
        } else {
          const r: CompressedPdf = await compressPdf(file, quality);
          out.push({
            name: file.name.replace(/\.[^.]+$/, "") + "-comprimido.pdf",
            originalSize: r.originalSize,
            compressedSize: r.compressedSize,
            ratio: r.ratio,
            type: "application/pdf",
            blob: r.blob,
          });
        }
      }
      setResults(out);
    } catch (e) {
      console.error(e);
      alert("Error al comprimir. Intenta con otro archivo.");
    } finally {
      setProcessing(false);
    }
  };

  const download = (r: Result) => {
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
  const totalCompressed = results.reduce((s, r) => s + r.compressedSize, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">🧊 Compresor Universal</h1>
          <p className="text-slate-400">Comprime imágenes y PDFs gratis, directo en tu navegador. Sin subir nada a servidores.</p>
        </header>

        {/* Type selector */}
        <div className="flex justify-center gap-3 mb-6">
          {(["image", "pdf"] as FileType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setFileType(t); setFiles([]); setResults([]); }}
              className={`px-6 py-2 rounded-full font-medium transition ${
                fileType === t ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {t === "image" ? "🖼️ Imágenes" : "📄 PDF"}
            </button>
          ))}
        </div>

        {/* Quality slider */}
        <div className="mb-6 bg-slate-800 rounded-xl p-4">
          <label className="flex justify-between text-sm text-slate-300 mb-2">
            <span>Calidad de compresión</span>
            <span className="font-mono text-blue-400">{Math.round(quality * 100)}%</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            {quality < 0.4 ? "Máxima compresión (más pérdida de calidad)" : quality < 0.7 ? "Balanceado" : "Alta calidad (menos compresión)"}
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
            dragOver ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptedExt}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="text-5xl mb-3">📂</div>
          <p className="text-lg font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="text-sm text-slate-500 mt-1">{fileType === "image" ? "JPG, PNG, WebP, GIF" : "Solo PDF"}</p>
        </div>

        {/* Files selected */}
        {files.length > 0 && (
          <div className="mt-4 bg-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-2">{files.length} archivo(s) seleccionado(s)</p>
            <ul className="text-sm space-y-1 max-h-40 overflow-auto">
              {files.map((f, i) => (
                <li key={i} className="flex justify-between text-slate-300">
                  <span className="truncate pr-3">📎 {f.name}</span>
                  <span className="text-slate-500 shrink-0">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setFiles([])}
              className="mt-3 text-xs text-red-400 hover:text-red-300"
            >
              Limpiar selección
            </button>
          </div>
        )}

        {/* Compress button */}
        <div className="mt-6 text-center">
          <button
            onClick={compress}
            disabled={!files.length || processing}
            className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-lg transition"
          >
            {processing ? "⏳ Comprimiendo..." : "🧊 Comprimir"}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8">
            <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-slate-300">Total: <span className="text-slate-200">{formatBytes(totalOriginal)}</span> → <span className="text-emerald-400 font-semibold">{formatBytes(totalCompressed)}</span> <span className="text-emerald-400 font-bold">{formatPercent(totalCompressed / totalOriginal)}</span></p>
            </div>
            <ul className="space-y-3">
              {results.map((r, i) => (
                <li key={i} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-sm text-slate-400">
                      {formatBytes(r.originalSize)} → <span className="text-emerald-400">{formatBytes(r.compressedSize)}</span>{" "}
                      <span className="text-emerald-500 font-semibold">{formatPercent(r.ratio)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => download(r)}
                    className="ml-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium shrink-0 transition"
                  >
                    ⬇️ Descargar
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => results.forEach(download)}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium transition"
              >
                ⬇️ Descargar todos
              </button>
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-slate-600">
          <p>Compresor Universal — 100% local, tus archivos nunca salen de tu dispositivo.</p>
        </footer>
      </div>
    </main>
  );
}
