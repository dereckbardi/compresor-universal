import { NextRequest, NextResponse } from "next/server";
import { cleanup, protectPdf } from "@/lib/server/convert";
import { parsePdfRequest } from "@/lib/pdfRequest";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/pdf/protect
 * body: multipart/form-data con "file", "password" y opcional "ownerPassword"
 * Cifra un PDF con contraseña.
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
    const { form, inputPath } = parsed;

    const password = String(form.get("password") || "");
    if (password.length < 4) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres." }, { status: 400, headers: withCors({}, req) });
    }
    const owner = typeof form.get("ownerPassword") === "string" ? (form.get("ownerPassword") as string) : undefined;

    const pdf = await protectPdf(inputPath, password, owner);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: withCors(
        {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="protegido.pdf"',
        },
        req
      ),
    });
  } catch (err: any) {
    console.error("protect error:", err);
    return NextResponse.json({ error: "No se pudo proteger el PDF." }, { status: 500, headers: withCors({}, req) });
  } finally {
    if (dir) await cleanup(dir);
  }
}
