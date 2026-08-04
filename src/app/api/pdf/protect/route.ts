import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, protectPdf } from "@/lib/server/convert";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/pdf/protect
 * body: multipart/form-data con "file", "password" y opcional "ownerPassword"
 * Cifra un PDF con contraseÃ±a.
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

    const password = String(form.get("password") || "");
    if (password.length < 4) {
      return NextResponse.json({ error: "La contraseÃ±a debe tener al menos 4 caracteres." }, { status: 400, headers: withCors({}, req) });
    }
    const owner = typeof form.get("ownerPassword") === "string" ? (form.get("ownerPassword") as string) : undefined;

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());
    const inputPath = await writeInput(dir, file.name || "documento.pdf", buf);

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

