"use client";

import { useEffect, useState } from "react";
import PdfPreview from "@/components/PdfPreview";
import { apiUrl } from "@/lib/backendUrl";

interface Props {
  file: File;
}

/**
 * Vista previa de un archivo de Office (Word/PPT/Excel).
 * Convierte el archivo a PDF en el servidor (LibreOffice) y muestra el PDF resultante.
 */
export default function OfficePreview({ file }: Props) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPdfBlob(null);
    setError(false);

    const convert = async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(apiUrl("/api/convert/office-to-pdf"), { method: "POST", body: form });
        if (!res.ok) throw new Error("fallo");
        const blob = await res.blob();
        if (cancelled) return;
        setPdfBlob(blob);
      } catch (e) {
        if (!cancelled) setError(true);
      }
    };
    convert();
    return () => { cancelled = true; };
  }, [file]);

  if (error) {
    return (
      <div className="w-full h-96 bg-neutral-100/80 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-white/10 flex items-center justify-center text-neutral-500 text-sm">
        No se pudo previsualizar este archivo
      </div>
    );
  }

  if (!pdfBlob) {
    return (
      <div className="w-full h-96 bg-neutral-100/80 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-white/10 flex flex-col items-center justify-center text-neutral-600 dark:text-neutral-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Generando vista previa...</p>
        <p className="text-xs text-neutral-600">Convirtiendo a PDF en el servidor</p>
      </div>
    );
  }

  return <PdfPreview file={pdfBlob} />;
}
