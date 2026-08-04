import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, unlockPdf, isPdfBuffer } from "@/lib/server/convert";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 50 * 1024 * 1024;

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
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400, headers: withCors({}, req) });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 50MB." }, { status: 413, headers: withCors({}, req) });
    }

    const password = typeof form.get("password") === "string" ? (form.get("password") as string) : undefined;

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());

    if (!isPdfBuffer(buf)) {
      return NextResponse.json(
        { error: "El archivo no es un PDF válido." },
        { status: 400, headers: withCors({}, req) }
      );
    }

    const inputPath = await writeInput(dir, file.name || "documento.pdf", buf);

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
