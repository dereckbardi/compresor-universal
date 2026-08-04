import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, toPdfA } from "@/lib/server/convert";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/pdf/pdfa
 * body: multipart/form-data con "file"
 * Convierte un PDF al estándar PDF/A (archivo para conservación a largo plazo).
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
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400, headers: withCors({}, req) });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 50MB." }, { status: 413, headers: withCors({}, req) });
    }

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());
    const inputPath = await writeInput(dir, file.name || "documento.pdf", buf);

    const pdf = await toPdfA(inputPath);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: withCors(
        {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="pdfa.pdf"',
        },
        req
      ),
    });
  } catch (err: any) {
    console.error("pdfa error:", err);
    return NextResponse.json({ error: "No se pudo convertir el PDF a PDF/A." }, { status: 500, headers: withCors({}, req) });
  } finally {
    if (dir) await cleanup(dir);
  }
}
