"use client";

import { Suspense, useCallback, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ToolTransition, HeroFade, ResultPop } from "@/components/animations";
import PdfPreview from "@/components/PdfPreview";
import ImageToPdfPreview from "@/components/ImageToPdfPreview";
import PdfLivePreview from "@/components/PdfLivePreview";
import PdfThumbnail from "@/components/PdfThumbnail";
import BallSlider from "@/components/BallSlider";
import PdfPageSelector from "@/components/PdfPageSelector";
import PdfRedactEditor from "@/components/PdfRedactEditor";
import SignatureModal, { SignatureResult } from "@/components/SignatureModal";
import PdfFullViewer from "@/components/PdfFullViewer";
import ResultScreen from "@/components/ResultScreen";
import OfficePreview from "@/components/OfficePreview";
import Logo from "@/components/Logo";
import { compressImage, formatBytes, formatPercent, CompressedImage } from "@/lib/imageCompressor";
import { compressPdf, CompressedPdf } from "@/lib/pdfCompressor";
import {
  mergePdfs, splitPdf, splitByRanges, splitBySize, removePages, extractPages, rotatePdf,
  imagesToPdf, pdfToJpg, extractImagesFromPdf, extractEachPage, addWatermark, addPageNumbers, addSignature, redactPdf, cropPdf, redactPdfAtPoints, repairPdf, PdfResult,
} from "@/lib/pdfOps";
import { ocrPdf } from "@/lib/ocr";
import { officeToPdf, unlockPdf, protectPdf, toPdfA, pdfToOffice, htmlToPdf } from "@/lib/serverClient";
import { TOOL_CONTENT, VALID_MODES, type Mode } from "@/lib/toolContent";

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

// Herramientas que procesan el archivo en nuestro servidor (LibreOffice/qpdf/Ghostscript)
// en vez de hacerlo 100% en el navegador. Se usa para mostrar el aviso correcto al usuario.
const SERVER_MODES = new Set<Mode>(["word-pdf", "ppt-pdf", "excel-pdf", "pdf-word", "pdf-ppt", "pdf-excel", "html-pdf", "unlock", "protect", "pdf-a"]);

export default function Home({ initialMode }: { initialMode?: Mode } = {}) {
  return <HomeContent initialMode={initialMode} />;
}

/**
 * Lee ?tool=ID de la URL (compatibilidad con enlaces antiguos tipo /?tool=merge;
 * las páginas nuevas usan /unir-pdf directamente vía initialMode). Aislado en su
 * propio componente + Suspense para que SOLO esta partecita se difiera durante
 * el renderizado estático — así el resto de la página (el <h1>, los botones, todo
 * el contenido) sí queda en el HTML generado por el servidor, en vez de quedar
 * vacío hasta que carga el JavaScript (importante para SEO).
 */
function ToolParamSync({ onFound }: { onFound: (mode: Mode) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tool = searchParams.get("tool");
    if (tool && VALID_MODES.has(tool as Mode)) {
      onFound(tool as Mode);
    }
  }, [searchParams, onFound]);
  return null;
}

function HomeContent({ initialMode }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode ?? "image");
  const [quality, setQuality] = useState(0.7);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pagesInput, setPagesInput] = useState("");
  const [rotateDeg, setRotateDeg] = useState(90);
  const [watermarkText, setWatermarkText] = useState("CONFIDENCIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);
  const [watermarkColor, setWatermarkColor] = useState<[number, number, number]>([1, 1, 1]);
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
  const [jpgQuality, setJpgQuality] = useState(0.9);
  const [jpgMode, setJpgMode] = useState<"paginas" | "extraer">("paginas");
  const [selRemovePages, setSelRemovePages] = useState<Set<number>>(new Set());
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [showAllWarning, setShowAllWarning] = useState(false);
  const [extractAllMode, setExtractAllMode] = useState(false);
  const [splitMode, setSplitMode] = useState<"personalizado" | "fijo">("personalizado");
  const [splitRanges, setSplitRanges] = useState<{ start: number; end: number }[]>([]);
  const [splitStart, setSplitStart] = useState(1);
  const [splitEnd, setSplitEnd] = useState(1);
  const [splitSize, setSplitSize] = useState(2);
  const [splitUnify, setSplitUnify] = useState(false);
  const [redactRects, setRedactRects] = useState<{ page: number; x: number; y: number; w: number; h: number }[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [signature, setSignature] = useState<SignatureResult | null>(null);
  const [clipSignature, setClipSignature] = useState<string | null>(null);
  const [signPos, setSignPos] = useState({ x: 20, y: 40, w: 120 });
  const [signPage, setSignPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [protectPassword, setProtectPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showProtectPw, setShowProtectPw] = useState(false);
  const [showUnlockPw, setShowUnlockPw] = useState(false);
  const [htmlInput, setHtmlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const signInputRef = useRef<HTMLInputElement>(null);

  const isMulti = mode === "merge" || mode === "jpg-pdf" || mode === "image" || mode === "pdf" || mode === "pdf-jpg";
  const isImageInput = mode === "image" || mode === "jpg-pdf";
  const isOfficeInput = mode === "word-pdf" || mode === "ppt-pdf" || mode === "excel-pdf";
  const isHtmlInput = mode === "html-pdf";
  const isPdfInput = mode === "pdf" || mode === "merge" || mode === "split" || mode === "pdf-jpg" || mode === "rotate" || mode === "extract" || mode === "remove" || mode === "watermark" || mode === "page-num" || mode === "sign" || mode === "redact" || mode === "crop" || mode === "unlock" || mode === "protect" || mode === "pdf-a" || mode === "repair" || mode === "ocr";
  const isServerMode = SERVER_MODES.has(mode);
  const acceptedExt = isImageInput ? "image/*" : isOfficeInput ? ".doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.rtf,.txt" : isHtmlInput ? ".html,.htm" : "application/pdf,.pdf";

  // Título/descripción por herramienta: viven en @/lib/toolContent para que las
  // páginas SEO (/[tool]) usen exactamente el mismo texto en <title>/<meta description>.
  const titles = TOOL_CONTENT;

  const switchMode = (m: Mode) => {
    setMode(m);
    setFiles([]);
    setResults([]);
    setError(null);
    setPagesInput("");
    setPagesError(null);
    setSelRemovePages(new Set());
    setPdfTotalPages(0);
    setShowAllWarning(false);
    setExtractAllMode(false);
  };

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setError(null);
    setResults([]);
    // Filtrar por tipo según la herramienta
    const arr = Array.from(list).filter((f) =>
      isImageInput ? f.type.startsWith("image/") : isOfficeInput ? /office|word|presentation|spreadsheet|officedocument|text\/plain|application\/rtf|opendocument/.test(f.type) || /\.(docx?|pptx?|xlsx?|odt|odp|ods|rtf|txt)$/i.test(f.name) : f.type === "application/pdf" || /\.[pP][dD][fF]$/.test(f.name)
    );
    if (arr.length === 0) {
      setError(isImageInput ? "Solo se permiten imágenes (JPG, PNG, WebP)" : isOfficeInput ? "Solo se permiten archivos de Word, PowerPoint o Excel" : "Solo se permiten archivos PDF");
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
        case "merge": {
          if (files.length < 2) throw new Error("Necesitas al menos 2 archivos PDF para unirlos");
          r = await mergePdfs(files); break;
        }
        case "split": {
          const label = files[0].name.replace(/\.pdf$/i, "");
          if (splitMode === "fijo") {
            if (!splitSize || splitSize < 1) throw new Error("Indica cada cuántas páginas dividir");
            r = await splitBySize(files[0], Math.floor(splitSize), label);
          } else {
            if (!splitRanges.length) throw new Error("Añade al menos un rango de páginas");
            r = await splitByRanges(files[0], splitRanges, label);
          }
          break;
        }
        case "pdf-jpg": {
          const out: Result[] = [];
          for (const file of files) {
            if (jpgMode === "extraer") {
              const r = await extractImagesFromPdf(file, file.name.replace(/\.pdf$/i, ""));
              r.blobs.forEach((blob, idx) => {
                out.push({
                  name: r.names[idx], originalSize: r.originalSize, compressedSize: r.compressedSize,
                  ratio: r.compressedSize / r.originalSize, blob,
                });
              });
            } else {
              const scale = jpgQuality >= 0.9 ? 2.5 : jpgQuality >= 0.7 ? 1.5 : 0.8;
              const r = await pdfToJpg(file, scale, file.name.replace(/\.pdf$/i, ""));
              r.blobs.forEach((blob, idx) => {
                out.push({
                  name: r.names[idx], originalSize: r.originalSize, compressedSize: r.compressedSize,
                  ratio: r.compressedSize / r.originalSize, blob,
                });
              });
            }
          }
          setResults(out); setProcessing(false); return;
        }
        case "rotate": r = await rotatePdf(files[0], rotateDeg); break;
        case "extract": {
          const pages = selRemovePages.size ? Array.from(selRemovePages) : parsePages();
          if (!pages.length) throw new Error("Selecciona las páginas a extraer (visto naranja en las miniaturas o escribe ej: 1,3,5)");
          if (pdfTotalPages > 0 && pages.some((p) => p > pdfTotalPages)) throw new Error(`El PDF solo tiene ${pdfTotalPages} página(s)`);
          // Si se usó "Extraer todas las páginas", cada página va en un PDF separado
          if (extractAllMode) {
            r = await extractEachPage(files[0], pages, files[0].name.replace(/\.pdf$/i, ""));
          } else {
            r = await extractPages(files[0], pages);
          }
          break;
        }
        case "remove": {
          const pages = selRemovePages.size ? Array.from(selRemovePages) : parsePages();
          if (!pages.length) throw new Error("Selecciona las páginas a eliminar (clic en las miniaturas o escribe ej: 1,3,5)");
          if (pdfTotalPages > 0 && pages.some((p) => p > pdfTotalPages)) throw new Error(`El PDF solo tiene ${pdfTotalPages} página(s)`);
          r = await removePages(files[0], pages); break;
        }
        case "jpg-pdf": r = await imagesToPdf(files, { pageSize: imgPageSize, orientation: imgOrientation, margin: imgMargin, unify: imgUnify }); break;
        case "watermark": {
          if (!watermarkText.trim()) throw new Error("Escribe el texto de la marca de agua");
          r = await addWatermark(files[0], watermarkText, { opacity: watermarkOpacity, color: watermarkColor }); break;
        }
        case "page-num": r = await addPageNumbers(files[0], numPosition); break;
        case "sign": {
          if (!signature) throw new Error("Crea tu firma primero (botón Crear firma)");
          const sigFile = new File([signature.blob], "firma.png", { type: "image/png" });
          r = await addSignature(files[0], sigFile, { page: signPage, x: signPos.x, y: signPos.y, w: signPos.w }); break;
        }
        case "redact": {
          if (!redactRects.length) throw new Error("Marca los textos a censurar en la vista previa primero");
          r = await redactPdfAtPoints(files[0], redactRects); break;
        }
        case "crop": {
          const l = cropL, r2 = cropR, t = cropT, b = cropB;
          if (l + r2 >= 100 || t + b >= 100) throw new Error("El área de recorte es inválida (deja al menos algo de página)");
          r = await cropPdf(files[0], { x: l / 100, y: b / 100, w: (100 - l - r2) / 100, h: (100 - t - b) / 100 }); break;
        }
        case "word-pdf":
        case "ppt-pdf":
        case "excel-pdf": {
          // Conversión vía servidor (LibreOffice)
          const out: Result[] = [];
          for (const file of files) {
            const s = await officeToPdf(file);
            out.push({ name: s.name, originalSize: s.originalSize, compressedSize: s.compressedSize, ratio: s.compressedSize / s.originalSize, blob: s.blob });
          }
          setResults(out); setProcessing(false); return;
        }
        case "pdf-word":
        case "pdf-ppt":
        case "pdf-excel": {
          const target = mode === "pdf-word" ? "docx" : mode === "pdf-ppt" ? "pptx" : "xlsx";
          const out: Result[] = [];
          for (const file of files) {
            const s = await pdfToOffice(file, target as any);
            out.push({ name: s.name, originalSize: s.originalSize, compressedSize: s.compressedSize, ratio: s.compressedSize / s.originalSize, blob: s.blob });
          }
          setResults(out); setProcessing(false); return;
        }
        case "unlock": {
          const s = await unlockPdf(files[0], unlockPassword || undefined);
          setResults([{ name: s.name, originalSize: s.originalSize, compressedSize: s.compressedSize, ratio: s.compressedSize / s.originalSize, blob: s.blob }]); setProcessing(false); return;
        }
        case "protect": {
          if (!protectPassword) throw new Error("Escribe una contraseña para proteger el PDF");
          if (protectPassword.length < 4) throw new Error("La contraseña debe tener al menos 4 caracteres");
          const s = await protectPdf(files[0], protectPassword);
          setResults([{ name: s.name, originalSize: s.originalSize, compressedSize: s.compressedSize, ratio: s.compressedSize / s.originalSize, blob: s.blob }]); setProcessing(false); return;
        }
        case "pdf-a": {
          const s = await toPdfA(files[0]);
          setResults([{ name: s.name, originalSize: s.originalSize, compressedSize: s.compressedSize, ratio: s.compressedSize / s.originalSize, blob: s.blob }]); setProcessing(false); return;
        }
        case "repair": {
          r = await repairPdf(files[0]); break;
        }
        case "ocr": {
          const o = await ocrPdf(files[0]);
          setResults(o.blobs.map((blob, i) => ({ name: o.names[i], originalSize: o.originalSize, compressedSize: o.compressedSize, ratio: o.compressedSize / o.originalSize, blob }))); setProcessing(false); return;
        }
        case "html-pdf": {
          if (!htmlInput.trim()) throw new Error("Pega el HTML en el recuadro de la derecha para convertirlo a PDF");
          const s = await htmlToPdf(htmlInput);
          setResults([{ name: s.name, originalSize: s.originalSize, compressedSize: s.compressedSize, ratio: s.compressedSize / s.originalSize, blob: s.blob }]); setProcessing(false); return;
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
    if (mode === "split") {
      return (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">Divide tu PDF en varios documentos. Elige el modo de división.</p>

          {/* Modo de rango */}
          <div>
            <label className="text-sm font-semibold text-neutral-300 block mb-2">Modo de rango</label>
            <div className="space-y-2">
              <button
                onClick={() => setSplitMode("personalizado")}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${splitMode === "personalizado" ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
              >
                Personalizado
              </button>
              <button
                onClick={() => setSplitMode("fijo")}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${splitMode === "fijo" ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
              >
                Fijo
              </button>
            </div>
          </div>

          {/* Personalizado: rangos */}
          {splitMode === "personalizado" && (
            <div className="space-y-3">
              <label className="text-sm text-neutral-400 block">Rangos de páginas</label>
              {splitRanges.length === 0 && (
                <p className="text-xs text-neutral-500">Añade un rango para empezar. Ej: de la página 1 a la 5.</p>
              )}
              {/* Lista de rangos añadidos */}
              {splitRanges.length > 0 && (
                <div className="space-y-2">
                  {splitRanges.map((rg, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                      <span className="text-neutral-300">Rango {idx + 1}: <span className="font-semibold">de {rg.start} a {rg.end}</span></span>
                      <button onClick={() => setSplitRanges(splitRanges.filter((_, i) => i !== idx))} className="text-neutral-500 hover:text-red-400 transition text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Añadir rango */}
              <div className="bg-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-500">De la página</label>
                  <input
                    type="number"
                    min="1"
                    max={pdfTotalPages || 1000}
                    value={splitStart}
                    onChange={(e) => setSplitStart(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-black border border-neutral-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <label className="text-xs text-neutral-500">a</label>
                  <input
                    type="number"
                    min="1"
                    max={pdfTotalPages || 1000}
                    value={splitEnd}
                    onChange={(e) => setSplitEnd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-black border border-neutral-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const start = Math.min(splitStart, splitEnd);
                    const end = Math.max(splitStart, splitEnd);
                    if (pdfTotalPages > 0 && end > pdfTotalPages) {
                      setPagesError(`El PDF solo tiene ${pdfTotalPages} páginas`);
                      return;
                    }
                    setPagesError(null);
                    setSplitRanges([...splitRanges, { start, end }]);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-orange-500 text-orange-500 hover:bg-orange-500/10 text-sm font-medium transition"
                >
                  + Añadir rango
                </button>
                {pagesError && <p className="text-xs text-red-400">⚠️ {pagesError}</p>}
              </div>
            </div>
          )}

          {/* Fijo: cada N páginas */}
          {splitMode === "fijo" && (
            <div>
              <label className="text-sm text-neutral-400 block mb-2">Dividir cada cuántas páginas</label>
              <input
                type="number"
                min="1"
                max={pdfTotalPages || 100}
                value={splitSize}
                onChange={(e) => setSplitSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
              {pdfTotalPages > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-amber-300 text-xs mt-2">
                  Este PDF se dividirá en archivos de {Math.max(1, splitSize)} página{Math.max(1, splitSize) === 1 ? "" : "s"}.
                  <br />Se generarán {Math.ceil(pdfTotalPages / Math.max(1, splitSize))} PDFs.
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    if (mode === "extract" || mode === "remove") {
      return (
        <div>
          {mode === "remove" ? (
            <div className="space-y-3">
              <label className="text-sm text-neutral-400 block">Selecciona las páginas a eliminar</label>
              <p className="text-xs text-neutral-500">El selector visual está en la columna izquierda. Haz clic en las páginas que quieres quitar.</p>
              <div>
                <label className="text-xs text-neutral-500 block mb-1">O escríbelas manualmente (ej: 1,3,5)</label>
                <input
                  value={pagesInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPagesInput(val);
                    // Validar contra el total de páginas del PDF
                    const nums = val.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
                    if (pdfTotalPages > 0 && nums.some((n) => n > pdfTotalPages)) {
                      setPagesError(`El PDF solo tiene ${pdfTotalPages} página(s). Los números deben estar entre 1 y ${pdfTotalPages}.`);
                      return;
                    }
                    setPagesError(null);
                    setSelRemovePages(new Set(nums));
                  }}
                  placeholder={`ej: 1,3,5 (máx ${pdfTotalPages || "?"})`}
                  className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                />
                {pagesError && (
                  <p className="mt-2 text-xs text-red-400">⚠️ {pagesError}</p>
                )}
              </div>
              {selRemovePages.size > 0 && (
                <button
                  onClick={() => setSelRemovePages(new Set())}
                  className="text-xs text-neutral-500 hover:text-red-400 transition"
                >
                  ✕ Limpiar selección ({selRemovePages.size} página(s))
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">Selecciona las páginas a extraer con el visor de la izquierda (visto naranja).</p>

              {/* Botón: Extraer todas las páginas */}
              <button
                onClick={() => {
                  if (pdfTotalPages > 0) {
                    setSelRemovePages(new Set(Array.from({ length: pdfTotalPages }, (_, i) => i + 1)));
                    setPagesInput(Array.from({ length: pdfTotalPages }, (_, i) => i + 1).join(","));
                    setPagesError(null);
                    setShowAllWarning(true);
                    setExtractAllMode(true);
                  }
                }}
                className="w-full flex flex-col items-start px-3 py-3 rounded-lg border text-left transition bg-orange-500 text-black border-orange-500 hover:bg-orange-400"
              >
                <span className="text-sm font-semibold">Extraer todas las páginas</span>
              </button>
              {showAllWarning && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-amber-300 text-xs">
                  ⚠️ Las páginas seleccionadas se convertirán en diferentes archivos PDF. {pdfTotalPages || selRemovePages.size} PDF serán creados.
                </div>
              )}

              {/* Botón: Seleccionar páginas manualmente */}
              <div>
                <label className="text-xs text-neutral-500 block mb-1">Seleccionar páginas (ej: 1,3,5)</label>
                <input
                  value={pagesInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPagesInput(val);
                    setShowAllWarning(false);
                    setExtractAllMode(false);
                    const nums = val.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
                    if (pdfTotalPages > 0 && nums.some((n) => n > pdfTotalPages)) {
                      setPagesError(`El PDF solo tiene ${pdfTotalPages} página(s). Los números deben estar entre 1 y ${pdfTotalPages}.`);
                      return;
                    }
                    setPagesError(null);
                    setSelRemovePages(new Set(nums));
                  }}
                  placeholder={`ej: 1,3,5 (máx ${pdfTotalPages || "?"})`}
                  className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                />
                {pagesError && (
                  <p className="mt-2 text-xs text-red-400">⚠️ {pagesError}</p>
                )}
              </div>
              {selRemovePages.size > 0 && (
                <button
                  onClick={() => { setSelRemovePages(new Set()); setPagesInput(""); setPagesError(null); setShowAllWarning(false); setExtractAllMode(false); }}
                  className="text-xs text-neutral-500 hover:text-red-400 transition"
                >
                  ✕ Limpiar selección ({selRemovePages.size} página(s))
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
    if (mode === "rotate") {
      return (
        <div>
          {/* Encabezado con Restablecer */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-neutral-300">Rotación</span>
            <button
              onClick={() => setRotateDeg(0)}
              className="text-xs text-orange-500 underline hover:text-orange-400 transition"
            >
              Restablecer
            </button>
          </div>
          <p className="text-xs text-neutral-500 mb-3">Gira el documento para corregir su orientación. Actual: {rotateDeg}°</p>

          <div className="space-y-2">
            {/* Girar izquierda */}
            <button
              onClick={() => setRotateDeg(rotateDeg - 90)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-orange-500 hover:bg-neutral-800 transition"
            >
              <span className="w-9 h-9 rounded-lg bg-orange-500 text-black flex items-center justify-center text-xl font-bold">↺</span>
              <span className="text-sm font-semibold uppercase tracking-wide">Izquierda</span>
            </button>
            {/* Girar derecha */}
            <button
              onClick={() => setRotateDeg(rotateDeg + 90)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-orange-500 hover:bg-neutral-800 transition"
            >
              <span className="w-9 h-9 rounded-lg bg-orange-500 text-black flex items-center justify-center text-xl font-bold">↻</span>
              <span className="text-sm font-semibold uppercase tracking-wide">Derecha</span>
            </button>
          </div>
        </div>
      );
    }
    if (mode === "watermark") {
      const colors = [
        { name: "Negro", rgb: [0, 0, 0] as [number, number, number] },
        { name: "Blanco", rgb: [1, 1, 1] as [number, number, number] },
        { name: "Gris", rgb: [0.5, 0.5, 0.5] as [number, number, number] },
        { name: "Humo", rgb: [0.85, 0.85, 0.85] as [number, number, number] },
      ];
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Texto de la marca de agua</label>
            <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="ej: CONFIDENCIAL, tu nombre, tu web" className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Color de la letra</label>
            <div className="flex gap-2">
              {colors.map((c) => {
                const active = watermarkColor[0] === c.rgb[0] && watermarkColor[1] === c.rgb[1] && watermarkColor[2] === c.rgb[2];
                return (
                  <button
                    key={c.name}
                    onClick={() => setWatermarkColor(c.rgb)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${active ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
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
            <label className="text-sm text-neutral-400 block mb-2">Tu firma</label>
            {signature ? (
              <div className="border border-white/10 rounded-lg p-2 bg-white/5 relative">
                <img src={signature.dataUrl} alt="Firma" className="w-full h-20 object-contain" />
                <button onClick={() => { setSignature(null); setSignPage(0); }} className="absolute top-1 right-1 w-6 h-6 rounded-md bg-red-600 text-white text-xs hover:bg-red-500" title="Eliminar firma">✕</button>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Aún no has creado una firma.</p>
            )}
            <button onClick={() => setSignOpen(true)} className="w-full mt-2 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-sm font-semibold transition">
              {signature ? "Cambiar firma" : "Crear firma"}
            </button>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setClipSignature(signature?.dataUrl ?? null)} disabled={!signature} className="flex-1 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 text-xs font-medium disabled:opacity-40 transition">⧉ Copiar</button>
              <button onClick={() => { if (clipSignature) { setSignature({ ...(signature ?? { dataUrl: clipSignature, blob: new Blob(), width: 500, height: 180 }), dataUrl: clipSignature }); } }} disabled={!clipSignature} className="flex-1 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:border-orange-500 text-xs font-medium disabled:opacity-40 transition">📋 Pegar</button>
            </div>
            <p className="text-xs text-neutral-600 mt-2">💡 Arrastra la firma sobre el PDF para colocarla, usa la esquina para ajustar su tamaño, y elige la página con las miniaturas.</p>
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
    if (mode === "pdf-jpg") {
      return (
        <div className="space-y-5">
          {/* Selección de modo */}
          <div className="space-y-2">
            <button
              onClick={() => setJpgMode("paginas")}
              className={`w-full flex flex-col items-start px-3 py-3 rounded-lg border text-left transition ${jpgMode === "paginas" ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
            >
              <span className="text-sm font-semibold">Páginas a JPG</span>
              <span className="text-[10px] opacity-70 mt-0.5">Cada página del PDF se convertirá en una imagen JPG. Se crearán {files.length ? "los JPG de cada página" : "N"} JPG.</span>
            </button>
            <button
              onClick={() => setJpgMode("extraer")}
              className={`w-full flex flex-col items-start px-3 py-3 rounded-lg border text-left transition ${jpgMode === "extraer" ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
            >
              <span className="text-sm font-semibold">Extraer imágenes</span>
              <span className="text-[10px] opacity-70 mt-0.5">Todas las imágenes dentro del archivo PDF se extraerán y se convertirán a JPG.</span>
            </button>
          </div>

          {/* Opciones de calidad (solo en modo Páginas a JPG) */}
          {jpgMode === "paginas" && (
            <div>
              <label className="text-sm text-neutral-400 block mb-2">Calidad de imagen</label>
              <div className="space-y-2">
                {[
                  { v: 0.9, name: "Alta", desc: "Máxima resolución" },
                  { v: 0.7, name: "Normal", desc: "Recomendada" },
                  { v: 0.5, name: "Baja", desc: "Menor resolución, más ligera" },
                ].map((lvl) => (
                  <button
                    key={lvl.v}
                    onClick={() => setJpgQuality(lvl.v)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition ${Math.abs(jpgQuality - lvl.v) < 0.05 ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
                  >
                    <span className="text-sm font-medium">{lvl.name}</span>
                    <span className="text-[10px] opacity-70">{lvl.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    if (mode === "merge") {
      return (
        <div className="space-y-3">
          {files.length < 2 ? (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-amber-300 text-sm">
              ⚠️ Por favor, selecciona más archivos PDF haciendo click en 'Seleccionar archivos PDF'. Necesitas al menos 2 para poder unirlos.
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Los {files.length} PDFs se unirán en el orden mostrado. Arrastra para reordenar.</p>
          )}
        </div>
      );
    }
    if (mode === "redact") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Busca el texto a censurar en la vista previa de la izquierda, o detecta automáticamente tarjetas, teléfonos y emails.
          </p>
          {redactRects.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-amber-300 text-xs">
              ⚠️ {redactRects.length} elemento(s) marcados para censurar. Revisa el documento antes de continuar.
            </div>
          )}
        </div>
      );
    }
    if (mode === "unlock") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Si tu PDF tiene contraseña, escríbela para poder desbloquearlo. Si solo tenía restricciones, se eliminarán automáticamente.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            🔓 Esta herramienta procesa tu archivo y contraseña en nuestro servidor (no en tu navegador), porque se necesita software especializado. Se eliminan automáticamente al terminar.
          </div>
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Contraseña (opcional)</label>
            <div className="relative">
              <input
                type={showUnlockPw ? "text" : "password"}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Contraseña del PDF"
                className="w-full bg-black border border-neutral-700 rounded-lg pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowUnlockPw(!showUnlockPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-orange-400 transition"
                title={showUnlockPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showUnlockPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (mode === "protect") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Añade una contraseña para que solo las personas autorizadas puedan abrir tu PDF.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            🔒 Esta herramienta procesa tu archivo y contraseña en nuestro servidor (no en tu navegador), porque se necesita software especializado. Se eliminan automáticamente al terminar.
          </div>
          <div>
            <label className="text-sm text-neutral-400 block mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showProtectPw ? "text" : "password"}
                value={protectPassword}
                onChange={(e) => setProtectPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full bg-black border border-neutral-700 rounded-lg pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowProtectPw(!showProtectPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-orange-400 transition"
                title={showProtectPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showProtectPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {protectPassword && protectPassword.length < 4 && (
            <p className="text-xs text-red-400">⚠️ La contraseña debe tener al menos 4 caracteres.</p>
          )}
        </div>
      );
    }
    if (mode === "pdf-a") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            PDF/A es el formato estándar para archivar documentos a largo plazo. Asegura que tu PDF se vea igual dentro de muchos años.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            📦 Se generará una versión PDF/A de tu documento. Este proceso se hace en nuestro servidor (no en tu navegador) y el archivo se elimina automáticamente al terminar.
          </div>
        </div>
      );
    }
    if (mode === "word-pdf" || mode === "ppt-pdf" || mode === "excel-pdf") {
      const labels: Record<string, string> = {
        "word-pdf": "Word (.doc, .docx)",
        "ppt-pdf": "PowerPoint (.ppt, .pptx)",
        "excel-pdf": "Excel (.xls, .xlsx)",
      };
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            La conversión se realiza en el servidor manteniendo el formato original.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            📄 Formatos: {labels[mode]} y ODF (.odt, .odp, .ods)
          </div>
        </div>
      );
    }
    if (mode === "pdf-word" || mode === "pdf-ppt" || mode === "pdf-excel") {
      const labels: Record<string, string> = {
        "pdf-word": "Word (.docx)",
        "pdf-ppt": "PowerPoint (.pptx)",
        "pdf-excel": "Excel (.xlsx)",
      };
      const notes: Record<string, string> = {
        "pdf-word": "El texto se volverá editable. El formato puede variar según la complejidad del PDF.",
        "pdf-ppt": "Cada página del PDF se convierte en una diapositiva.",
        "pdf-excel": "Los datos se convierten a celdas. Los PDFs muy complejos pueden perder estructura.",
      };
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">{notes[mode]}</p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            📄 Se generará un archivo {labels[mode]} editable.
          </div>
        </div>
      );
    }
    if (mode === "repair") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Reconstruye la estructura del PDF para arreglar archivos dañados, corruptos o que no se abren bien.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            🔧 Se generará una versión reparada del documento. Si está muy dañado, se te avisará.
          </div>
        </div>
      );
    }
    if (mode === "ocr") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Reconoce el texto de tus escaneos (español e inglés) y genera un PDF buscable y seleccionable.
          </p>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-orange-300 text-xs">
            🔍 El procesamiento se hace en tu navegador (puede tardar en PDFs grandes).
          </div>
        </div>
      );
    }
    if (mode === "html-pdf") {
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">Pega tu código HTML aquí y se convertirá a PDF en el servidor.</p>
          <textarea
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="<h1>Hola</h1><p>Este es mi documento.</p>"
            rows={10}
            className="w-full bg-black border border-neutral-700 rounded-lg px-4 py-3 text-xs font-mono focus:outline-none focus:border-orange-500 resize-y"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-orange-500/30">
      <Suspense fallback={null}>
        <ToolParamSync onFound={setMode} />
      </Suspense>
      {/* Header - full width */}
      <header className="border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={1.3} />
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
          <Link href="/tools" className="btn-shine shrink-0 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition whitespace-nowrap">
            Todas las herramientas
          </Link>
        </div>
      </header>

      {/* Input de archivos SIEMPRE montado (para poder añadir más desde la vista de trabajo) */}
      <input ref={inputRef} type="file" multiple accept={acceptedExt} className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

      {/* Cuerpo: resultado | home (sin archivos) | vista de trabajo (con archivos) */}
      {results.length > 0 ? (
        <ResultScreen
          mode={mode}
          results={results}
          totalOriginal={totalOriginal}
          totalCompressed={totalCompressed}
          onDownloadAll={() => results.forEach(download)}
          onDownloadOne={(r) => download(r)}
          onDelete={() => { setResults([]); setFiles([]); }}
          onBack={() => { setResults([]); }}
          onContinue={(m) => switchMode(m as Mode)}
        />
      ) : files.length === 0 ? (
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
                  : mode === "word-pdf"
                  ? [{ f: "DOC", c: "text-blue-400 border-blue-500/40" }, { f: "DOCX", c: "text-blue-400 border-blue-500/40" }, { f: "ODT", c: "text-emerald-400 border-emerald-500/40" }]
                  : mode === "ppt-pdf"
                  ? [{ f: "PPT", c: "text-orange-400 border-orange-500/40" }, { f: "PPTX", c: "text-orange-400 border-orange-500/40" }, { f: "ODP", c: "text-emerald-400 border-emerald-500/40" }]
                  : mode === "excel-pdf"
                  ? [{ f: "XLS", c: "text-emerald-400 border-emerald-500/40" }, { f: "XLSX", c: "text-emerald-400 border-emerald-500/40" }, { f: "ODS", c: "text-emerald-400 border-emerald-500/40" }]
                  : mode === "unlock" || mode === "protect" || mode === "pdf-a"
                  ? [{ f: "PDF", c: "text-red-400 border-red-500/40" }]
                  : mode === "pdf-word"
                  ? [{ f: "PDF", c: "text-red-400 border-red-500/40" }, { f: "DOCX", c: "text-blue-400 border-blue-500/40" }]
                  : mode === "pdf-ppt"
                  ? [{ f: "PDF", c: "text-red-400 border-red-500/40" }, { f: "PPTX", c: "text-orange-400 border-orange-500/40" }]
                  : mode === "pdf-excel"
                  ? [{ f: "PDF", c: "text-red-400 border-red-500/40" }, { f: "XLSX", c: "text-emerald-400 border-emerald-500/40" }]
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
                {isServerMode ? (
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Archivo eliminado tras procesar</span>
                ) : (
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> En tu navegador</span>
                )}
              </motion.div>
            </div>
          </HeroFade>

          {/* Drop zone / HTML input */}
          {mode === "html-pdf" ? (
            <motion.div className="border-2 border-dashed border-orange-500/50 rounded-3xl p-10 text-center">
              <p className="text-lg font-semibold mb-3">HTML listo para convertir</p>
              <p className="text-neutral-500 text-sm mb-5">Pega tu código HTML en el panel de la derecha y pulsa convertir.</p>
              <button onClick={run} disabled={processing || !htmlInput.trim()} className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 font-semibold text-black transition">
                {processing ? "⏳ Convirtiendo..." : "Convertir a PDF"}
              </button>
            </motion.div>
          ) : (
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
                {isImageInput ? "🖼️" : isOfficeInput ? "📄" : "📄"}
              </motion.div>
            </div>
            <p className="text-2xl font-semibold mb-2">Seleccionar archivo{isMulti ? "s" : ""}</p>
            <p className="text-neutral-500">o arrastra y suelta aquí</p>
            <p className="text-xs text-neutral-600 mt-3">
              {isImageInput ? "JPG, PNG, WebP, GIF" : isOfficeInput ? "Word, PowerPoint, Excel, ODF" : "Solo PDF"}
            </p>
          </motion.div>
          </ToolTransition>
          )}
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
                ) : (mode === "image" || mode === "pdf" || mode === "merge" || mode === "pdf-jpg") ? (
                  <div className="w-full">
                    {/* Miniaturas de todos los archivos a comprimir/unir/convertir + botón añadir */}
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
                ) : mode === "split" ? (
                  <PdfPageSelector
                    file={files[0]}
                    selected={new Set()}
                    totalPages={pdfTotalPages}
                    onTotal={(total) => setPdfTotalPages(total)}
                    ranges={splitMode === "personalizado"
                      ? [{ start: splitStart, end: splitEnd }, ...splitRanges]
                      : splitSize > 0 && pdfTotalPages > 0
                        ? Array.from({ length: Math.ceil(pdfTotalPages / splitSize) }, (_, i) => ({
                            start: i * splitSize + 1,
                            end: Math.min((i + 1) * splitSize, pdfTotalPages),
                          }))
                        : []}
                    onToggle={() => {}}
                  />
                ) : mode === "remove" ? (
                  <PdfPageSelector
                    file={files[0]}
                    selected={selRemovePages}
                    totalPages={pdfTotalPages}
                    onTotal={(total) => setPdfTotalPages(total)}
                    selectAll={false}
                    onToggle={(num) => {
                      setSelRemovePages((prev) => {
                        const next = new Set(prev);
                        if (next.has(num)) next.delete(num);
                        else next.add(num);
                        // Sincronizar campo de texto con la selección visual
                        setPagesInput(Array.from(next).sort((a, b) => a - b).join(","));
                        return next;
                      });
                    }}
                  />
                ) : mode === "extract" ? (
                  <PdfPageSelector
                    file={files[0]}
                    selected={selRemovePages}
                    totalPages={pdfTotalPages}
                    onTotal={(total) => setPdfTotalPages(total)}
                    selectAll={true}
                    onToggle={(num) => {
                      setSelRemovePages((prev) => {
                        const next = new Set(prev);
                        if (next.has(num)) next.delete(num);
                        else next.add(num);
                        setPagesInput(Array.from(next).sort((a, b) => a - b).join(","));
                        return next;
                      });
                    }}
                  />
                ) : mode === "redact" ? (
                  <PdfRedactEditor file={files[0]} onRects={(rects) => setRedactRects(rects)} />
                ) : (mode === "watermark" || mode === "page-num" || mode === "crop" || mode === "rotate") ? (
                  <PdfLivePreview
                    file={files[0]}
                    mode={mode}
                    watermarkText={watermarkText}
                    watermarkOpacity={watermarkOpacity}
                    watermarkColor={watermarkColor}
                    numPosition={numPosition}
                    crop={{ l: cropL, t: cropT, r: cropR, b: cropB }}
                    rotateDeg={rotateDeg}
                  />
                ) : mode === "sign" ? (
                  <PdfFullViewer
                    file={files[0]}
                    signature={signature?.dataUrl}
                    signPos={signPos}
                    signPage={signPage}
                    onSignMove={(pos) => setSignPos(pos)}
                    onSignPage={(page) => setSignPage(page)}
                    onSignRemove={() => { setSignature(null); }}
                    onSignCopy={() => { if (signature) setClipSignature(signature.dataUrl); }}
                  />
                ) : (mode === "word-pdf" || mode === "ppt-pdf" || mode === "excel-pdf") ? (
                  <OfficePreview file={files[0]} />
                ) : (mode === "unlock" || mode === "protect" || mode === "pdf-a" || mode === "pdf-word" || mode === "pdf-ppt" || mode === "pdf-excel") ? (
                  <PdfPreview file={files[0]} />
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
                  disabled={processing || (mode === "merge" && files.length < 2)}
                  className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-black transition-colors hover:shadow-lg hover:shadow-orange-500/25"
                >
                  {processing ? "⏳ Procesando..." : t.title}
                </motion.button>
              </div>

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

      {/* Modal de firma */}
      {signOpen && (
        <SignatureModal
          onConfirm={(sig) => { setSignature(sig); setSignOpen(false); }}
          onCancel={() => setSignOpen(false)}
        />
      )}
    </main>
  );
}
