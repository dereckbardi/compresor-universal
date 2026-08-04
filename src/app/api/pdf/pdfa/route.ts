import { NextRequest, NextResponse } from "next/server";
import { cleanup, toPdfA } from "@/lib/server/convert";
import { parsePdfRequest } from "@/lib/pdfRequest";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    const parsed = await parsePdfRequest(req);
    if (!parsed.ok) return parsed.response;
    dir = parsed.dir;
    const { inputPath } = parsed;

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
