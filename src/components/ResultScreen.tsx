"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, ArrowRight, DownloadSimple, FileArchive, LinkSimple, Trash, type Icon } from "@phosphor-icons/react";
import { formatBytes } from "@/lib/imageCompressor";
import { TOOL_ICONS } from "@/lib/tools";
import PdfPreview from "@/components/PdfPreview";

function ContinueIcon({ name }: { name: string }) {
  const TIcon: Icon | undefined = TOOL_ICONS[name];
  if (!TIcon) return null;
  return <TIcon size={20} className="shrink-0" />;
}

interface ResultItem {
  name: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  blob: Blob;
}

interface Props {
  mode: string;
  results: ResultItem[];
  onDownloadAll: () => void;
  onDownloadOne: (r: ResultItem) => void;
  onDelete: () => void;
  onContinue: (mode: string) => void;
  onBack: () => void;
  totalOriginal: number;
  totalCompressed: number;
}

const ACTION_TEXT: Record<string, { msg: string; btn: string }> = {
  image: { msg: "Tus imágenes han sido comprimidas", btn: "Descargar imágenes optimizadas" },
  pdf: { msg: "Tu PDF ha sido comprimido", btn: "Descargar PDF optimizado" },
  merge: { msg: "Tus PDFs han sido unidos", btn: "Descargar PDF unido" },
  split: { msg: "Tu PDF ha sido dividido", btn: "Descargar PDFs divididos" },
  "pdf-jpg": { msg: "Tu PDF ha sido convertido a JPG", btn: "Descargar imágenes JPG" },
  rotate: { msg: "Tu PDF ha sido rotado", btn: "Descargar PDF rotado" },
  extract: { msg: "Las páginas han sido extraídas", btn: "Descargar PDFs extraídos" },
  remove: { msg: "Las páginas han sido eliminadas", btn: "Descargar PDF" },
  "jpg-pdf": { msg: "Tus imágenes han sido convertidas a PDF", btn: "Descargar PDF" },
  watermark: { msg: "Tu marca de agua ha sido añadida", btn: "Descargar PDF con marca de agua" },
  "page-num": { msg: "Los números de página han sido añadidos", btn: "Descargar PDF numerado" },
  sign: { msg: "Tu PDF ha sido firmado", btn: "Descargar PDF firmado" },
  redact: { msg: "Tu PDF ha sido censurado", btn: "Descargar PDF censurado" },
  crop: { msg: "Tu PDF ha sido recortado", btn: "Descargar PDF recortado" },
  "word-pdf": { msg: "Tu documento Word se ha convertido a PDF", btn: "Descargar PDF" },
  "ppt-pdf": { msg: "Tu presentación se ha convertido a PDF", btn: "Descargar PDF" },
  "excel-pdf": { msg: "Tu hoja de cálculo se ha convertido a PDF", btn: "Descargar PDF" },
  unlock: { msg: "Tu PDF ha sido desbloqueado", btn: "Descargar PDF desbloqueado" },
  protect: { msg: "Tu PDF ha sido protegido con contraseña", btn: "Descargar PDF protegido" },
  "pdf-a": { msg: "Tu PDF se ha convertido a PDF/A", btn: "Descargar PDF/A" },
  "pdf-word": { msg: "Tu PDF se ha convertido a Word", btn: "Descargar documento Word" },
  "pdf-ppt": { msg: "Tu PDF se ha convertido a PowerPoint", btn: "Descargar presentación" },
  "pdf-excel": { msg: "Tu PDF se ha convertido a Excel", btn: "Descargar hoja de cálculo" },
  repair: { msg: "Tu PDF ha sido reparado", btn: "Descargar PDF reparado" },
  ocr: { msg: "El texto ha sido reconocido con OCR", btn: "Descargar PDF con OCR" },
  "html-pdf": { msg: "Tu HTML se ha convertido a PDF", btn: "Descargar PDF" },
};

const CONTINUE: Record<string, { id: string; icon: string; label: string }[]> = {
  default: [
    { id: "image", icon: "Image", label: "Comprimir imagen" },
    { id: "pdf", icon: "ArrowsIn", label: "Comprimir PDF" },
    { id: "merge", icon: "PuzzlePiece", label: "Unir PDF" },
    { id: "split", icon: "Scissors", label: "Dividir PDF" },
    { id: "pdf-jpg", icon: "Image", label: "PDF a JPG" },
    { id: "jpg-pdf", icon: "FileImage", label: "JPG a PDF" },
    { id: "rotate", icon: "ArrowsClockwise", label: "Rotar PDF" },
    { id: "watermark", icon: "Drop", label: "Marca de agua" },
    { id: "extract", icon: "UploadSimple", label: "Extraer páginas" },
    { id: "remove", icon: "Trash", label: "Eliminar páginas" },
    { id: "redact", icon: "EyeSlash", label: "Censurar PDF" },
    { id: "sign", icon: "PenNib", label: "Firmar PDF" },
    { id: "page-num", icon: "Hash", label: "Números de página" },
    { id: "crop", icon: "Crop", label: "Recortar PDF" },
    { id: "word-pdf", icon: "FileDoc", label: "WORD a PDF" },
    { id: "ppt-pdf", icon: "FilePpt", label: "PPT a PDF" },
    { id: "excel-pdf", icon: "FileXls", label: "EXCEL a PDF" },
    { id: "unlock", icon: "LockSimpleOpen", label: "Desbloquear PDF" },
    { id: "protect", icon: "LockSimple", label: "Proteger PDF" },
    { id: "pdf-a", icon: "Package", label: "PDF a PDF/A" },
    { id: "pdf-word", icon: "FileDoc", label: "PDF a WORD" },
    { id: "pdf-ppt", icon: "FilePpt", label: "PDF a PPT" },
    { id: "pdf-excel", icon: "FileXls", label: "PDF a EXCEL" },
    { id: "repair", icon: "Wrench", label: "Reparar PDF" },
    { id: "ocr", icon: "MagnifyingGlass", label: "OCR PDF" },
    { id: "html-pdf", icon: "Globe", label: "HTML a PDF" },
  ],
};

// Por defecto usamos la lista completa
const CONTINUE_FOR: Record<string, { id: string; icon: string; label: string }[]> = {
  image: [
    { id: "jpg-pdf", icon: "FileImage", label: "JPG a PDF" },
    { id: "pdf", icon: "ArrowsIn", label: "Comprimir PDF" },
    { id: "merge", icon: "PuzzlePiece", label: "Unir PDF" },
    { id: "split", icon: "Scissors", label: "Dividir PDF" },
    { id: "watermark", icon: "Drop", label: "Marca de agua" },
    { id: "redact", icon: "EyeSlash", label: "Censurar PDF" },
    { id: "sign", icon: "PenNib", label: "Firmar PDF" },
  ],
};

export default function ResultScreen({ mode, results, onDownloadAll, onDownloadOne, onDelete, onContinue, onBack, totalOriginal, totalCompressed }: Props) {
  const a = ACTION_TEXT[mode] || ACTION_TEXT.default;
  const continues = CONTINUE_FOR[mode] || CONTINUE.default;
  const saved = totalOriginal > 0 ? Math.max(0, Math.round((1 - totalCompressed / totalOriginal) * 100)) : 0;
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? continues.slice(0, 10) : continues.slice(0, 6);

  // Preview del primer resultado
  const previewUrl = results[0] ? URL.createObjectURL(results[0].blob) : null;
  const isImage = results[0]?.blob.type.startsWith("image/");
  const isPdfBlob = results[0]?.blob.type === "application/pdf" || results[0]?.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold">{a.msg}</h2>
        <p className="text-sm text-neutral-500 mt-1">{results.length} archivo(s) generado(s)</p>
        {(mode === "image" || mode === "pdf") && totalOriginal > 0 && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            <span className="line-through text-neutral-500">{formatBytes(totalOriginal)}</span>
            <span className="mx-2 text-neutral-600"><ArrowRight size={14} className="inline-block align-[-2px]" /></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatBytes(totalCompressed)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-2">({saved}% menos)</span>
          </p>
        )}
      </motion.div>

      {/* Vista previa del resultado */}
      {previewUrl && (
        <div className="flex justify-center mb-8">
          {isImage ? (
            <img src={previewUrl} alt={results[0].name} className="max-h-72 rounded-xl shadow-xl border border-neutral-200 dark:border-white/10" />
          ) : isPdfBlob ? (
            <div className="w-full max-w-md">
              <PdfPreview file={results[0].blob} />
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center justify-center gap-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900 p-8 text-center">
              <FileArchive size={44} weight="duotone" className="text-orange-500" />
              <p className="text-sm font-semibold break-all">{results[0].name}</p>
              <p className="text-xs text-neutral-500">Archivo generado — usa el botón de descarga</p>
            </div>
          )}
        </div>
      )}

      {/* Fila de acciones */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-lg hover:border-orange-500 flex items-center justify-center transition" title="Volver"><ArrowLeft size={22} weight="bold" /></button>
        <button onClick={onDelete} className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500 flex items-center justify-center transition" title="Eliminar"><Trash size={22} /></button>
        <button onClick={onDownloadAll} className="px-6 sm:px-10 min-h-12 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-base sm:text-xl font-bold transition hover:shadow-lg hover:shadow-orange-500/25 text-center">
          {a.btn}
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(previewUrl || "");
            alert("Enlace de descarga copiado");
          }}
          className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500 flex items-center justify-center transition"
          title="Compartir enlace"
        ><LinkSimple size={22} /></button>
      </div>

      {/* Lista de archivos si hay varios */}
      {results.length > 1 && (
        <div className="max-h-48 overflow-y-auto space-y-2 mb-8">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 rounded-lg px-4 py-2.5 border border-neutral-200/70 dark:border-white/5">
              <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate pr-2">{r.name}</span>
              <button onClick={() => onDownloadOne(r)} className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-300 text-xs font-semibold shrink-0"><DownloadSimple size={14} weight="bold" className="inline-block align-[-2px] mr-1" /> Descargar</button>
            </div>
          ))}
        </div>
      )}

      {/* Continuar a... */}
      <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-white/10 p-5">
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Continuar a...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((t) => (
            <button key={t.id} onClick={() => onContinue(t.id)} className="min-h-12 flex items-center gap-2.5 px-3 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-orange-500 hover:text-neutral-900 dark:hover:text-white text-sm font-medium transition">
              <ContinueIcon name={t.icon} /> {t.label}
            </button>
          ))}
        </div>
        {continues.length > 6 && (
          <button onClick={() => setShowAll(!showAll)} className="mt-3 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-300 font-medium transition">
            {showAll ? "Ver menos" : "Ver más"}
          </button>
        )}
      </div>
    </div>
  );
}
