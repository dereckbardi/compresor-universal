import { NextRequest, NextResponse } from "next/server";

/** Orígenes permitidos para CORS. */
export const ALLOWED_ORIGINS = [
  "https://comprimeme.vercel.app",
  "https://comprimeme-956795747152.us-central1.run.app",
];

/** Cabeceras CORS base aplicadas a todas las respuestas. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
  "Access-Control-Max-Age": "86400",
};

/** Devuelve el origen de la petición si está permitido; de lo contrario null. */
function resolveAllowOrigin(req?: NextRequest): string | null {
  const origin = req?.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

/**
 * Fusiona las cabeceras CORS en las cabeceras de una respuesta.
 * Refleja el origen permitido (con Vary: Origin) para que el navegador acepte
 * la respuesta; si no hay cabecera Origin (p. ej. curl) usa "*".
 */
export function withCors(headers: HeadersInit = {}, req?: NextRequest): Headers {
  const h = new Headers(headers);
  const origin = resolveAllowOrigin(req);
  if (origin) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
  } else if (!req?.headers.get("origin")) {
    h.set("Access-Control-Allow-Origin", CORS_HEADERS["Access-Control-Allow-Origin"]);
  }
  h.set("Access-Control-Allow-Methods", CORS_HEADERS["Access-Control-Allow-Methods"]);
  h.set("Access-Control-Allow-Headers", CORS_HEADERS["Access-Control-Allow-Headers"]);
  h.set("Access-Control-Max-Age", CORS_HEADERS["Access-Control-Max-Age"]);
  return h;
}

/**
 * Respuesta para el preflight OPTIONS. IMPORTANTE: 204 NO admite cuerpo, asi
 * que se devuelve un NextResponse vacio (null) con los headers CORS.
 */
export function corsOptionsResponse(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: withCors({}, req) });
}
