import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DATA_DIR = path.join(process.cwd(), "data");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");

export function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Introduce un correo electrónico válido." },
        { status: 400, headers: withCors({}, req) }
      );
    }

    await fs.mkdir(DATA_DIR, { recursive: true });

    let subscribers: string[] = [];
    try {
      const raw = await fs.readFile(SUBSCRIBERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        subscribers = parsed.filter((s) => typeof s === "string");
      }
    } catch {
      // El archivo no existe o está vacío: empezamos de cero.
    }

    if (!subscribers.includes(email)) {
      subscribers.push(email);
      await fs.writeFile(
        SUBSCRIBERS_FILE,
        JSON.stringify(subscribers, null, 2) + "\n",
        "utf-8"
      );
    }

    return NextResponse.json({ ok: true }, { headers: withCors({}, req) });
  } catch (err: unknown) {
    console.error("subscribe error:", err);
    return NextResponse.json(
      { error: "No pudimos guardar tu suscripción." },
      { status: 500, headers: withCors({}, req) }
    );
  }
}
