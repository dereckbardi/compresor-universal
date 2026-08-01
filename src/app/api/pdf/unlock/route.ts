import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, unlockPdf } from "@/lib/server/convert";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/pdf/unlock
 * body: multipart/form-data con "file" y opcional "password"
 * Elimina la contraseña de un PDF.
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

    const password = typeof form.get("password") === "string" ? (form.get("password") as string) : undefined;

    dir = await makeTempDir();
    const buf = Buffer.from(await file.arrayBuffer());
    const inputPath = await writeInput(dir, file.name || "documento.pdf", buf);

    const pdf = await unlockPdf(inputPath, password);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="desbloqueado.pdf"',
      },
    });
  } catch (err: any) {
    console.error("unlock error:", err);
    const msg = String(err?.message || "");
    // qpdf avisa con "invalid password" cuando la contraseña es incorrecta
    if (/password|invalid/i.test(msg)) {
      return NextResponse.json({ error: "Contraseña incorrecta o el PDF no está protegido." }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo desbloquear el PDF." }, { status: 500 });
  } finally {
    if (dir) await cleanup(dir);
  }
}
