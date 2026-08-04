import { NextRequest, NextResponse } from "next/server";
import { cleanup, unlockPdf } from "@/lib/server/convert";
import { parsePdfRequest } from "@/lib/pdfRequest";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/pdf/unlock
 * body: multipart/form-data con "file" y opcional "password"
 * Elimina la contraseña de un PDF.
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

    const password = typeof form.get("password") === "string" ? (form.get("password") as string) : undefined;

    const pdf = await unlockPdf(inputPath, password);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: withCors(
        {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="desbloqueado.pdf"',
        },
        req
      ),
    });
  } catch (err: any) {
    console.error("unlock error:", err);
    const msg = String(err?.message || "");
    // qpdf avisa con "invalid password" cuando la contraseña es incorrecta
    if (/password|invalid/i.test(msg)) {
      return NextResponse.json({ error: "Contraseña incorrecta o el PDF no está protegido." }, { status: 400, headers: withCors({}, req) });
    }
    return NextResponse.json({ error: "No se pudo desbloquear el PDF." }, { status: 500, headers: withCors({}, req) });
  } finally {
    if (dir) await cleanup(dir);
  }
}
