import { PdfResult } from "@/lib/pdfOps";

/**
 * Cliente para las herramientas que requieren servidor (LibreOffice, qpdf, Ghostscript).
 * Estas llamadas van a las API routes de Next.js, que corren el motor en el backend.
 */

/** Resultado de una conversión vía servidor. */
export interface ServerResult {
  name: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
}

async function postForm(
  url: string,
  file: File,
  extra?: Record<string, string>
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
  }
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    let msg = "Error al procesar el archivo en el servidor.";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* no json */
    }
    throw new Error(msg);
  }
  return res.blob();
}

/** Convierte un archivo de Office (Word/PPT/Excel/ODF) a PDF vía LibreOffice. */
export async function officeToPdf(file: File): Promise<ServerResult> {
  const originalSize = file.size;
  const blob = await postForm("/api/convert/office-to-pdf", file);
  const base = file.name.replace(/\.[^.]+$/, "");
  return {
    name: `${base}.pdf`,
    originalSize,
    compressedSize: blob.size,
    blob,
  };
}

/** Convierte un PDF a Office (Word/PPT/Excel) vía LibreOffice. */
export async function pdfToOffice(file: File, target: "docx" | "pptx" | "xlsx"): Promise<ServerResult> {
  const originalSize = file.size;
  const blob = await postForm("/api/convert/pdf-to-office", file, { target });
  const base = file.name.replace(/\.pdf$/i, "") || "documento";
  return {
    name: `${base}.${target}`,
    originalSize,
    compressedSize: blob.size,
    blob,
  };
}

/** Elimina la contraseña de un PDF vía qpdf. */
export async function unlockPdf(file: File, password?: string): Promise<ServerResult> {
  const originalSize = file.size;
  const blob = await postForm("/api/pdf/unlock", file, password ? { password } : undefined);
  return {
    name: "desbloqueado.pdf",
    originalSize,
    compressedSize: blob.size,
    blob,
  };
}

/** Protege un PDF con contraseña vía qpdf. */
export async function protectPdf(file: File, password: string): Promise<ServerResult> {
  const originalSize = file.size;
  const blob = await postForm("/api/pdf/protect", file, { password });
  return {
    name: "protegido.pdf",
    originalSize,
    compressedSize: blob.size,
    blob,
  };
}

/** Convierte un PDF a PDF/A vía Ghostscript. */
export async function toPdfA(file: File): Promise<ServerResult> {
  const originalSize = file.size;
  const blob = await postForm("/api/pdf/pdfa", file);
  return {
    name: "pdfa.pdf",
    originalSize,
    compressedSize: blob.size,
    blob,
  };
}

/** Convierte HTML a PDF vía servidor (LibreOffice). */
export async function htmlToPdf(html: string): Promise<ServerResult> {
  const res = await fetch("/api/convert/html-to-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });
  if (!res.ok) {
    let msg = "Error al convertir el HTML en el servidor.";
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  return {
    name: "pagina.pdf",
    originalSize: new Blob([html]).size,
    compressedSize: blob.size,
    blob,
  };
}

/** Convierte un PdfResult (de pdfOps) en ServerResult (misma forma de Result). */
export function toResult(r: PdfResult): ServerResult[] {
  return r.blobs.map((blob, i) => ({
    name: r.names[i],
    originalSize: r.originalSize,
    compressedSize: r.compressedSize,
    blob,
  }));
}
