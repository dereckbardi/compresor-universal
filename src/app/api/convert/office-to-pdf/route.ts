import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, isOfficeFile, officeToPdf } from "@/lib/server/convert";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 120; // Cloud Run / Next: 120s

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/convert/office-to-pdf
 * body: multipart/form-data con campo "file"
 * Convierte Word/PPT/Excel/ODF a PDF usando LibreOffice.
 */
export function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req);
}

export async function POST(req: NextRequest) {
  let dir: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibiÃ³ ningÃºn archivo." }, { status: 400, headers: withCors({}, req) });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el lÃ­mite de 50MB." }, { status: 413, headers: withCors({}, req) });
    }

    const filename = file.name || "documento";
    if (!isOfficeFile(filename)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa Word, PowerPoint, Excel u ODF." },
        { status: 415, headers: withCors({}, req) }
      );
    }

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());
    const inputPath = await writeInput(dir, filename, buf);

    const pdf = await officeToPdf(inputPath, filename);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: withCors(
        {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename.replace(/\.[^.]+$/, "")}.pdf"`,
        },
        req
      ),
    });
  } catch (err: any) {
    console.error("office-to-pdf error:", err);
    return NextResponse.json({ error: err?.message || "Error al convertir el archivo." }, { status: 500, headers: withCors({}, req) });
  } finally {
    if (dir) await cleanup(dir);
  }
}

