import { NextRequest, NextResponse } from "next/server";
import { makeTempDir, writeInput, cleanup, htmlToPdf } from "@/lib/server/convert";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SIZE = 2 * 1024 * 1024; // 2MB de HTML

/**
 * POST /api/convert/html-to-pdf
 * body: JSON { html: "..." }
 * Convierte HTML a PDF usando LibreOffice.
 */
export function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req);
}

export async function POST(req: NextRequest) {
  let dir: string | null = null;
  try {
    let html = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file instanceof File) {
        html = await file.text();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      html = body?.html || "";
    }

    html = (html || "").trim();
    if (!html) {
      return NextResponse.json({ error: "No se recibiÃ³ HTML." }, { status: 400, headers: withCors({}, req) });
    }
    if (html.length > MAX_SIZE) {
      return NextResponse.json({ error: "El HTML supera el lÃ­mite de 2MB." }, { status: 413, headers: withCors({}, req) });
    }

    dir = await makeTempDir();
    const filename = "pagina.html";
    const inputPath = await writeInput(dir, filename, Buffer.from(html, "utf-8"));

    const pdf = await htmlToPdf(inputPath, filename);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: withCors(
        {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="pagina.pdf"`,
        },
        req
      ),
    });
  } catch (err: any) {
    console.error("html-to-pdf error:", err);
    return NextResponse.json({ error: err?.message || "Error al convertir el HTML." }, { status: 500, headers: withCors({}, req) });
  } finally {
    if (dir) await cleanup(dir);
  }
}

