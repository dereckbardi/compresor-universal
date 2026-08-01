"use client";

import { Suspense, useCallback, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ToolTransition, HeroFade, ResultPop } from "@/components/animations";
import PdfPreview from "@/components/PdfPreview";
import ImageToPdfPreview from "@/components/ImageToPdfPreview";
import PdfLivePreview from "@/components/PdfLivePreview";
import PdfThumbnail from "@/components/PdfThumbnail";
import BallSlider from "@/components/BallSlider";
import { compressImage, formatBytes, formatPercent, CompressedImage } from "@/lib/imageCompressor";
import { compressPdf, CompressedPdf } from "@/lib/pdfCompressor";
import {
  mergePdfs, splitPdf, removePages, extractPages, rotatePdf,
  imagesToPdf, pdfToJpg, addWatermark, addPageNumbers, addSignature, redactPdf, cropPdf, PdfResult,
} from "@/lib/pdfOps";

type Mode = "image" | "pdf" | "merge" | "split" | "pdf-jpg" | "rotate" | "extract" | "remove" | "jpg-pdf" | "watermark" | "page-num" | "sign" | "redact" | "crop";

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



const VALID_MODES = new Set<Mode>(["image", "pdf", "merge", "split", "pdf-jpg", "rotate", "extract", "remove", "jpg-pdf", "watermark", "page-num", "sign", "redact", "crop"]);

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("image");

  // Read ?tool=ID from URL to open the right tool (linked from /tools panel)
  useEffect(() => {
    const tool = searchParams.get("tool");
    if (tool && VALID_MODES.has(tool as Mode)) {
      setMode(tool as Mode);
    }
  }, [searchParams]);
  const [quality, setQuality] = useState(0.7);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pagesInput, setPagesInput] = useState("");
  const [rotateDeg, setRotateDeg] = useState(90);
  const [watermarkText, setWatermarkText] = useState("CONFIDENCIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);
  const [numPosition, setNumPosition] = useState<"bottom" | "top">("bottom");
  const [signPosition, setSignPosition] = useState<"bottom-right" | "bottom-left" | "center">("bottom-right");
  const [signFile, setSignFile] = useState<File | null>(null);
  const [cropL, setCropL] = useState(5);
  const [cropT, setCropT] = useState(5);
  const [cropR, setCropR] = useState(5);
  const [cropB, setCropB] = useState(5);
  const [imgPageSize, setImgPageSize] = useState("A4");
  const [imgOrientation, setImgOrientation] = useState<"portrait" | "landscape">("portrait");
  const [imgMargin, setImgMargin] = useState("none");
  const [imgUnify, setImgUnify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const signInputRef = useRef<HTMLInputElement>(null);

  const isMulti = mode === "merge" || mode === "jpg-pdf" || mode === "image" || mode === "pdf";
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
    watermark: { title: "Marca de agua", desc: "Añade un texto semitransparente a todas las páginas de tu PDF para protegerlo o personalizarlo." },
    "page-num": { title: "Números de página", desc: "Añade números de página a tu PDF para que sea más fácil de navegar y referenciar." },
    sign: { title: "Firmar PDF", desc: "Añade tu firma a tu PDF sin necesidad de imprimirlo, perfecto para contratos." },
    redact: { title: "Censurar PDF", desc: "Oculta de forma permanente la información sensible de tu PDF con barras negras." },
    crop: { title: "Recortar PDF", desc: "Recorta el contenido de tu PDF a la zona que necesites, eliminando los márgenes." },
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
    // Filtrar por tipo según la herramienta
    const arr = Array.from(list).filter((f) =>
      isImageInput ? f.type.startsWith("image/") : f.type === "application/pdf"
    );
    if (arr.length === 0) {
      setError(isImageInput ? "Solo se permiten imágenes (JPG, PNG, WebP)" : "Solo se permiten archivos PDF");
      return;
    }
    setFiles((prev) => (isMulti ? [...prev, ...arr] : arr));
  }, [isMulti, isImageInput]);

  const parsePages = (): number[] =>
    pagesInput.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);

  // Arrastrar para reordenar archivos
  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null) return;
    setDragOver(true);
  };
  const handleDrop = (targetIdx: number) => {
    setDragOver(false);
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
  };

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
          const out: Result[] = [];
          for (const file of files) {
            const c: CompressedPdf = await compressPdf(file, quality);
            out.push({
              name: file.name.replace(/\.[^.]+$/, "") + "-comprimido.pdf",
              originalSize: c.originalSize, compressedSize: c.compressedSize,
              ratio: c.ratio, blob: c.blob,
            });
          }
          setResults(out); setProcessing(false); return;
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
        case "jpg-pdf": r = await imagesToPdf(files, { pageSize: imgPageSize, orientation: imgOrientation, margin: imgMargin, unify: imgUnify }); break;
        case "watermark": {
          if (!watermarkText.trim()) throw new Error("Escribe el texto de la marca de agua");
          r = await addWatermark(files[0], watermarkText, { opacity: watermarkOpacity }); break;
        }
        case "page-num": r = await addPageNumbers(files[0], numPosition); break;
        case "sign": {
          if (!signFile) throw new Error("Sube la imagen de tu firma");
          r = await addSignature(files[0], signFile, signPosition); break;
        }
        case "redact": r = await redactPdf(files[0]); break;
        case "crop": {
          const l = cropL, r2 = cropR, t = cropT, b = cropB;
          if (l + r2 >= 100 || t + b >= 100) throw new Error("El área de recorte es inválida (deja al menos algo de página)");
          r = await cropPdf(files[0], { x: l / 100, y: b / 100, w: (100 - l - r2) / 100, h: (100 - t - b) / 100 }); break;
        }
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

  // Panel de opciones según la herramienta (columna derecha)
  const renderOptions = () => {
    if (mode === "image" || mode === "pdf") {
      const isImg = mode === "image";
      return (
        <div className="space-y-4">
          {/* Niveles de compresión */}
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Nivel de compresión</label>
            <div className="space-y-2">
              {[
                { v: 0.4, name: "Extrema", desc: "Menos calidad, mayor reducción" },
                { v: 0.7, name: "Recomendada", desc: "Equilibrio perfecto" },
                { v: 0.9, name: "Baja", desc: "Alta calidad, menos reducción" },
              ].map((lvl) => (
                <button
                  key={lvl.v}
                  onClick={() => setQuality(lvl.v)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition ${Math.abs(quality - lvl.v) < 0.05 ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
                >
                  <span className="text-sm font-medium">{lvl.name}</span>
                  <span className="text-[10px] opacity-70 text-right max-w-[120px]">{lvl.desc}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Ajuste fino con bolitas (componente arrastrable) */}
          <div>
            <div className="flex justify-between items-center mb-2"><span className="text-sm text-neutral-400">Ajuste fino (calidad)</span><span className="text-sm font-semibold text-orange-500">{Math.round(quality * 100)}%</span></div>
            <BallSlider value={Math.round(quality * 100)} onChange={(v) => setQuality(v / 100)} min={10} max={100} step={10} />
            <div className="flex justify-between text-[10px] text-neutral-600 mt-1"><span>Menos calidad<br/>(más compresión)</span><span>Más calidad<br/>(menos compresión)</span></div>
          </div>
          <p className="text-[11px] text-neutral-500">
            {isImg ? "Comprime JPG, PNG y WebP reduciendo su peso sin perder calidad visible." : "Reduce el peso de tu PDF manteniendo la calidad del contenido."}
          </p>
        </div>
      );
    }
    if (mode === "extract" || mode === "remove") {
      return (
        <div>
          <label className="text-sm text-neutral-400 block mb-2">{mode === "remove" ? "Páginas a eliminar" : "Páginas a extraer"} (separadas por coma)</label>
          <input value={pagesInput} onChange={(e) => setPagesInput(e.target.value)} placeholder="ej: 1,3,5" className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
        </div>
      );
    }
    if (mode === "rotate") {
      return (
        <div>
          <label className="text-sm text-neutral-400 block mb-2">Ángulo de rotación</label>
          <div className="flex gap-2">
            {[90, 180, 270].map((d) => (
              <button key={d} onClick={() => setRotateDeg(d)} className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition ${rotateDeg === d ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{d}°</button>
            ))}
          </div>
        </div>
      );
    }
    if (mode === "watermark") {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Texto de la marca de agua</label>
            <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="ej: CONFIDENCIAL, tu nombre, tu web" className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <div className="flex justify-between mb-2"><span className="text-sm text-neutral-400">Transparencia</span><span className="text-sm font-semibold text-orange-500">{Math.round(watermarkOpacity * 100)}%</span></div>
            <BallSlider value={watermarkOpacity * 100} onChange={(v) => setWatermarkOpacity(v / 100)} min={5} max={80} step={5} />
          </div>
        </div>
      );
    }
    if (mode === "page-num") {
      return (
        <div>
          <label className="text-sm text-neutral-400 block mb-2">Posición del número</label>
          <div className="flex gap-2">
            {(["bottom", "top"] as const).map((p) => (
              <button key={p} onClick={() => setNumPosition(p)} className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium capitalize transition ${numPosition === p ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{p === "bottom" ? "Abajo" : "Arriba"}</button>
            ))}
          </div>
        </div>
      );
    }
    if (mode === "sign") {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Imagen de tu firma (PNG transparente)</label>
            <button onClick={() => signInputRef.current?.click()} className="w-full py-3 rounded-lg border border-dashed border-neutral-600 text-sm text-neutral-300 hover:border-orange-500 transition">{signFile ? `✅ ${signFile.name}` : "📎 Subir firma"}</button>
            <input ref={signInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setSignFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Posición</label>
            <div className="flex gap-2">
              {(["bottom-right", "bottom-left", "center"] as const).map((p) => (
                <button key={p} onClick={() => setSignPosition(p)} className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition ${signPosition === p ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{p.replace("-", " ")}</button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (mode === "crop") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Márgenes a recortar (%):</p>
          <div className="space-y-3">
            {[
              { k: "l" as const, label: "Izquierda", val: cropL, set: setCropL },
              { k: "r" as const, label: "Derecha", val: cropR, set: setCropR },
              { k: "t" as const, label: "Arriba", val: cropT, set: setCropT },
              { k: "b" as const, label: "Abajo", val: cropB, set: setCropB },
            ].map((s) => (
              <div key={s.k}>
                <div className="flex justify-between mb-1"><span className="text-xs text-neutral-400">{s.label}</span><span className="text-xs font-semibold text-orange-500">{s.val}%</span></div>
                <BallSlider value={s.val} onChange={(v) => s.set(v)} min={0} max={40} step={5} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (mode === "jpg-pdf") {
      return (
        <div className="space-y-5">
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Tamaño de página</label>
            <select value={imgPageSize} onChange={(e) => setImgPageSize(e.target.value)} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500">
              <option value="A4">A4 (297×210 mm)</option>
              <option value="A5">A5 (210×148 mm)</option>
              <option value="Letter">Carta (279×216 mm)</option>
              <option value="Legal">Legal (356×216 mm)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Orientación</label>
            <div className="flex gap-2">
              <button onClick={() => setImgOrientation("portrait")} className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition ${imgOrientation === "portrait" ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>Vertical</button>
              <button onClick={() => setImgOrientation("landscape")} className={`flex flex-1 items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition ${imgOrientation === "landscape" ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>Horizontal</button>
            </div>
          </div>
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Margen</label>
            <div className="flex gap-2">
              {[
                { v: "none", l: "Sin margen" },
                { v: "small", l: "Pequeño" },
                { v: "large", l: "Grande" },
              ].map((m) => (
                <button key={m.v} onClick={() => setImgMargin(m.v)} className={`flex flex-1 items-center justify-center px-2 py-2.5 rounded-lg border text-sm font-medium transition ${imgMargin === m.v ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{m.l}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-neutral-300 cursor-pointer select-none">
            <input type="checkbox" checked={imgUnify} onChange={(e) => setImgUnify(e.target.checked)} className="w-4 h-4 accent-orange-500" />
            Unir todas las imágenes en un único PDF
          </label>
          {!imgUnify && <p className="text-xs text-neutral-500">Se generará un PDF por cada imagen.</p>}
        </div>
      );
    }
    if (mode === "merge") {
      return <p className="text-sm text-neutral-400">Selecciona los archivos y pulsa el botón para unirlos.</p>;
    }
    if (mode === "redact") {
      return <p className="text-sm text-neutral-400">Se ocultarán con barras negras los bordes superior e inferior de cada página.</p>;
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-orange-500/30">
      {/* Header - full width */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-black text-sm">C</span>
            <span className="font-semibold tracking-widest text-sm hidden md:block">COMPRIMEME</span>
          </div>
          <nav className="flex items-center gap-1 text-sm flex-1 justify-center">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => switchMode(n.id)}
                className={`px-2.5 sm:px-3 py-2 rounded-lg whitespace-nowrap transition ${mode === n.id ? "text-orange-500" : "text-neutral-400 hover:text-white"}`}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <a href="/tools" className="btn-shine shrink-0 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition whitespace-nowrap">
            Todas las herramientas
          </a>
        </div>
      </header>

      {/* Input de archivos SIEMPRE montado (para poder añadir más desde la vista de trabajo) */}
      <input ref={inputRef} type="file" multiple accept={acceptedExt} className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

      {/* Cuerpo: home (sin archivos) vs vista de trabajo (con archivos) */}
      {files.length === 0 ? (
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

              {/* Iconos de formatos soportados */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="flex justify-center gap-3 mt-6"
              >
                {(mode === "image"
                  ? [{ f: "JPG", c: "text-blue-400 border-blue-500/40" }, { f: "PNG", c: "text-emerald-400 border-emerald-500/40" }, { f: "WebP", c: "text-orange-400 border-orange-500/40" }, { f: "GIF", c: "text-purple-400 border-purple-500/40" }]
                  : mode === "pdf"
                  ? [{ f: "PDF", c: "text-red-400 border-red-500/40" }]
                  : []
                ).map((x) => (
                  <span key={x.f} className={`px-4 py-1.5 rounded-full border ${x.c} text-sm font-semibold bg-black/40`}>{x.f}</span>
                ))}
              </motion.div>

              {/* Puntos de confianza */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-neutral-400"
              >
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Gratis</span>
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Sin registro</span>
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Ilimitado</span>
                <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> En tu navegador</span>
              </motion.div>
            </div>
          </HeroFade>

          {/* Drop zone */}
          <ToolTransition mode={`zone-${mode}`}>
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-200 ${dragOver ? "border-orange-500 bg-orange-500/5 scale-[1.01]" : "border-neutral-700 hover:border-neutral-500 bg-neutral-900/40 hover:bg-neutral-900/60"}`}
          >
            <div className="mb-5 flex justify-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-20 h-20 rounded-2xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/10"
              >
                {isImageInput ? "🖼️" : "📄"}
              </motion.div>
            </div>
            <p className="text-2xl font-semibold mb-2">Seleccionar archivo{isMulti ? "s" : ""}</p>
            <p className="text-neutral-500">o arrastra y suelta aquí</p>
            <p className="text-xs text-neutral-600 mt-3">
              {isImageInput ? "JPG, PNG, WebP, GIF" : "Solo PDF"}
            </p>
          </motion.div>
          </ToolTransition>
        </div>
      ) : (
        /* Vista de trabajo: preview izquierda + opciones derecha */
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Columna izquierda: vista previa (75%) */}
            <div className="flex-1 lg:w-[75%]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t.title}</h2>
                <button onClick={() => { setFiles([]); setResults([]); }} className="text-xs text-neutral-500 hover:text-red-400 transition">✕ Cambiar archivo</button>
              </div>
              <div className="bg-neutral-900/50 rounded-2xl border border-white/5 p-6 flex flex-col items-center">
                {mode === "jpg-pdf" ? (
                  <div className="w-full">
                    {/* Vista previa en vivo de TODAS las imágenes con opciones */}
                    <div className="flex flex-wrap gap-5 justify-center mb-6">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(i)}
                          className={`relative group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing transition ${dragIdx === i ? "opacity-50" : ""}`}
                        >
                          <div className="bg-white rounded-xl p-2 pb-1 shadow-lg">
                            <ImageToPdfPreview file={f} pageSize={imgPageSize} orientation={imgOrientation} margin={imgMargin} compact />
                          </div>
                          <p className="w-52 text-xs text-neutral-500 truncate text-center">{f.name}</p>
                          <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-orange-500 text-black text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-neutral-700 hover:bg-red-500 text-white text-[10px] flex items-center justify-center transition opacity-0 group-hover:opacity-100">✕</button>
                        </div>
                      ))}
                      {/* Botón + para añadir más */}
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="self-start w-52 h-[15rem] rounded-xl border-2 border-dashed border-orange-500/50 hover:border-orange-500 text-orange-500 text-5xl flex items-center justify-center transition hover:bg-orange-500/10"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-neutral-500 text-center">{files.length} imagen(es) · {formatBytes(files.reduce((s, f) => s + f.size, 0))}</p>
                    {files.length > 1 && <p className="text-[10px] text-neutral-600 text-center mt-1">Arrastra para cambiar el orden</p>}
                  </div>
                ) : (mode === "image" || mode === "pdf" || mode === "merge") ? (
                  <div className="w-full">
                    {/* Miniaturas de todos los archivos a comprimir/unir + botón añadir */}
                    <div className="flex flex-wrap gap-4 justify-center mb-5">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(i)}
                          className={`relative group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing transition ${dragIdx === i ? "opacity-50" : ""}`}
                        >
                          <div className="w-56 h-64 bg-white rounded-lg p-2 shadow-lg flex items-center justify-center overflow-hidden">
                            {mode === "image" ? (
                              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-contain rounded-md" />
                            ) : (
                              <PdfThumbnail file={f} />
                            )}
                          </div>
                          <p className="w-56 text-xs text-neutral-500 truncate text-center">{f.name}</p>
                          <span className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-orange-500 text-black text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-neutral-700 hover:bg-red-500 text-white text-[10px] flex items-center justify-center transition opacity-0 group-hover:opacity-100">✕</button>
                        </div>
                      ))}
                      {/* Botón + para añadir más */}
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="self-start w-56 h-[16rem] rounded-xl border-2 border-dashed border-orange-500/50 hover:border-orange-500 text-orange-500 text-5xl flex items-center justify-center transition hover:bg-orange-500/10"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-neutral-500 text-center">{files.length} archivo(s) · {formatBytes(files.reduce((s, f) => s + f.size, 0))}</p>
                    {files.length > 1 && <p className="text-[10px] text-neutral-600 text-center mt-1">Arrastra para cambiar el orden</p>}
                  </div>
                ) : (mode === "watermark" || mode === "page-num" || mode === "redact" || mode === "crop" || mode === "rotate") ? (
                  <PdfLivePreview
                    file={files[0]}
                    mode={mode}
                    watermarkText={watermarkText}
                    watermarkOpacity={watermarkOpacity}
                    numPosition={numPosition}
                    crop={{ l: cropL, t: cropT, r: cropR, b: cropB }}
                    rotateDeg={rotateDeg}
                  />
                ) : isImageInput ? (
                  <img src={URL.createObjectURL(files[0])} alt={files[0].name} className="max-w-full max-h-[500px] rounded-xl object-contain" />
                ) : (
                  <PdfPreview file={files[0]} />
                )}
                {(mode !== "jpg-pdf" && mode !== "image" && mode !== "pdf") && files[0] && (
                  <p className="text-sm text-neutral-500 mt-3 truncate max-w-full">{files[0].name} · {formatBytes(files[0].size)}</p>
                )}
                {(mode !== "jpg-pdf" && mode !== "image" && mode !== "pdf") && files.length > 1 && (
                  <p className="text-xs text-neutral-500 mt-2">+{files.length - 1} archivo(s) adicional(es) seleccionado(s)</p>
                )}
              </div>
            </div>

            {/* Columna derecha: opciones (25%) */}
            <div className="w-full lg:w-[25%] lg:min-w-[260px]">
              <div className="bg-neutral-900 rounded-2xl border border-white/5 p-5 sticky top-24 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-4">{t.title}</h3>
                  {renderOptions()}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">{error}</div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={run}
                  disabled={processing}
                  className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-black transition-colors hover:shadow-lg hover:shadow-orange-500/25"
                >
                  {processing ? "⏳ Procesando..." : t.title}
                </motion.button>
              </div>

              {/* Resultados debajo de opciones */}
              {results.length > 0 && (
                <div className="mt-4">
                  <div className="bg-neutral-900 border border-emerald-500/20 rounded-xl p-3 text-center mb-3">
                    <p className="text-xs text-neutral-400">
                      {formatBytes(totalOriginal)} → <span className="text-emerald-400 font-semibold">{formatBytes(totalCompressed)}</span>
                      {totalCompressed < totalOriginal && <span className="text-emerald-500 font-bold ml-1">{formatPercent(totalCompressed / totalOriginal)}</span>}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {results.map((r, i) => (
                      <ResultPop key={i} index={i}>
                        <li className="bg-neutral-900 rounded-xl p-3 flex items-center justify-between border border-white/5">
                          <span className="text-xs text-neutral-300 truncate pr-2">{r.name}</span>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => download(r)} className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-xs font-semibold shrink-0">⬇️</motion.button>
                        </li>
                      </ResultPop>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-neutral-600">
          <p>COMPRIMEME — 100% gratis y sin registro.</p>
        </div>
      </footer>
    </main>
  );
}
