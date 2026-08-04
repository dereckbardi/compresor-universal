"use server";
import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, isPdfBuffer } from "@/lib/server/convert";
import { withCors } from "@/lib/cors";

const MAX_SIZE = 50 * 1024 * 1024;

export type PdfRequestResult =
  | { ok: true; form: FormData; file: File; buf: Buffer; inputPath: string; dir: string }
  | { ok: false; response: NextResponse };

/**
 * Lee y valida una petición multipart de tipo PDF (un solo campo "file").
 * Comprueba: que el file exista, que no supere 50MB y que tenga firma %PDF-.
 * Devuelve un resultado con el buffer/inputPath y el dir temporal para cleanup,
 * o una NextResponse de error lista para devolver.
 */
export async function parsePdfRequest(req: NextRequest): Promise<PdfRequestResult> {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400, headers: withCors({}, req) }
      ),
    };
  }
  if (file.size > MAX_SIZE) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "El archivo supera el límite de 50MB." },
        { status: 413, headers: withCors({}, req) }
      ),
    };
  }

  const dir = await makeTempDir();
  const buf = Buffer.from(await file.arrayBuffer());

  if (!isPdfBuffer(buf)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "El archivo no es un PDF válido." },
        { status: 400, headers: withCors({}, req) }
      ),
    };
  }

  const inputPath = await writeInput(dir, file.name || "documento.pdf", buf);
  return { ok: true, form, file, buf, inputPath, dir };
}
