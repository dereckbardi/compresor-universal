import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, isOfficeFile, officeToPdf } from "@/lib/server/convert";

export const runtime = "nodejs";
export const maxDuration = 120; // Cloud Run / Next: 120s

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/convert/office-to-pdf
 * body: multipart/form-data con campo "file"
 * Convierte Word/PPT/Excel/ODF a PDF usando LibreOffice.
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

    const filename = file.name || "documento";
    if (!isOfficeFile(filename)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa Word, PowerPoint, Excel u ODF." },
        { status: 415 }
      );
    }

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());
    const inputPath = await writeInput(dir, filename, buf);

    const pdf = await officeToPdf(inputPath, filename);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename.replace(/\.[^.]+$/, "")}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("office-to-pdf error:", err);
    return NextResponse.json({ error: err?.message || "Error al convertir el archivo." }, { status: 500 });
  } finally {
    if (dir) await cleanup(dir);
  }
}
