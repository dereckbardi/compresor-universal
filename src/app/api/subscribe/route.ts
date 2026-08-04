import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Clave en Redis donde se guarda la lista de suscriptores.
// Guardamos un hash/set con "1" por email para deduplicar de forma atómica.
const SUBSCRIBERS_KEY = "subscribers";

// Cliente Redis desde las variables de entorno que Vercel KV/Upstash crea
// automáticamente (KV_REST_API_URL, KV_REST_API_TOKEN, KV_URL, etc.).
const redis = process.env.KV_REST_API_URL
  ? Redis.fromEnv()
  : new Redis({
      url: process.env.KV_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    });

// Límite de intentos de suscripción: 5 por IP cada 10 minutos (anti-spam).
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "ratelimit:subscribe",
});

export function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req);
}

export async function POST(req: NextRequest) {
  try {
    const hasKvEnv =
      !!process.env.KV_REST_API_URL ||
      (!!process.env.KV_URL && !!process.env.KV_REST_API_TOKEN);

    if (!hasKvEnv) {
      return NextResponse.json(
        { error: "Servicio de suscripción no configurado (faltan variables de Redis)." },
        { status: 500, headers: withCors({}, req) }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
        { status: 429, headers: withCors({}, req) }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Introduce un correo electrónico válido." },
        { status: 400, headers: withCors({}, req) }
      );
    }

    // Guarda el email como miembro de un set Redis (deduplica automáticamente).
    await redis.sadd(SUBSCRIBERS_KEY, email);

    return NextResponse.json({ ok: true }, { headers: withCors({}, req) });
  } catch (err: unknown) {
    console.error("subscribe error:", err);
    return NextResponse.json(
      { error: "No pudimos guardar tu suscripción." },
      { status: 500, headers: withCors({}, req) }
    );
  }
}
