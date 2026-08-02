import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, pdfToOffice } from "@/lib/server/convert";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/convert/pdf-to-office
 * body: multipart/form-data con "file" y "target" (docx | pptx | xlsx)
 * Convierte un PDF a Word/PowerPoint/Excel usando LibreOffice.
 */
export async function POST(req: NextRequest) {
  let dir: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 50MB." }, { status: 413 });
    }

    const target = String(form.get("target") || "docx");
    if (!["docx", "pptx", "xlsx"].includes(target)) {
      return NextResponse.json({ error: "Formato de salida no válido." }, { status: 400 });
    }
    // Validar que sea PDF
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten archivos PDF." }, { status: 415 });
    }

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());
    const inputPath = await writeInput(dir, file.name || "documento.pdf", buf);

    const { buffer, name } = await pdfToOffice(inputPath, file.name || "documento.pdf", target as any);

    const mime: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime[target],
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err: any) {
    console.error("pdf-to-office error:", err);
    return NextResponse.json(
      { error: "No se pudo convertir el PDF. El formato puede no ser compatible con la conversión." },
      { status: 500 }
    );
  } finally {
    if (dir) await cleanup(dir);
  }
}
