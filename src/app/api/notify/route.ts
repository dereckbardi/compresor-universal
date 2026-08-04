import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { withCors, corsOptionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

const SUBSCRIBERS_KEY = "subscribers";

const redis = process.env.KV_REST_API_URL
  ? Redis.fromEnv()
  : new Redis({
      url: process.env.KV_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    });

export function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req);
}

// Comparación de token en tiempo constante (anti timing attack).
function isValidToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Deben tener el mismo largo para timingSafeEqual; si no, ya es inválido
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildHtml(subject: string, message: string): string {
  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const paragraphs = escaped(message)
    .split(/\n+/)
    .filter((l) => l.trim())
    .map((l) => `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#404040">${l.replace(/^(•|-) /, "<span style=\"color:#f97316;font-weight:700\">• </span>")}</p>`)
    .join("");

  // Un botón/CTA generado a partir de la primera línea en negrita con asteriscos, si existe
  const ctaMatch = escaped(message).match(/\[CTA\]([^\n]+)/);
  const ctaButton = ctaMatch
    ? `<div style="text-align:center;margin:24px 0 8px">
        <a href="${escaped("https://comprimeme.vercel.app")}" style="display:inline-block;background:#f97316;color:#000000;text-decoration:none;font-weight:800;font-size:16px;padding:14px 32px;border-radius:12px">${escaped(ctaMatch[1].trim())}</a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background: #0a0a0a !important; }
    .card { background: #171717 !important; }
    .title { color: #ededed !important; }
    .body-text { color: #d4d4d4 !important; }
    .footer-text { color: #737373 !important; }
    .header-bar { background: #f97316 !important; }
  }
  body { margin:0; padding:0; -webkit-font-smoothing: antialiased; }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px" class="bg">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)" class="card">
        <!-- Header -->
        <tr>
          <td style="background:#f97316;padding:32px 40px;text-align:center" class="header-bar">
            <div style="display:inline-block;background:#000;color:#fff;width:46px;height:46px;line-height:46px;border-radius:12px;font-size:26px;font-weight:800">C</div>
            <div style="font-size:24px;font-weight:800;color:#000;letter-spacing:.02em;margin-top:10px">COMPRIMEME</div>
            <div style="font-size:13px;color:#3a3a3a;font-weight:600;margin-top:2px">Herramientas gratis para PDF e imágenes</div>
          </td>
        </tr>
        <!-- Cuerpo -->
        <tr>
          <td style="padding:40px" class="body">
            <h1 style="margin:0 0 18px;font-size:26px;font-weight:800;color:#0a0a0a;letter-spacing:-.01em" class="title">${escaped(subject)}</h1>
            <div class="body-text">${paragraphs}</div>
            ${ctaButton}
          </td>
        </tr>
        <!-- Pie -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #ececec;background:#fafafa" class="card">
            <p style="margin:0 0 6px;font-size:12px;color:#a3a3a3;text-align:center" class="footer-text">COMPRIMEME — 100% gratis y sin registro</p>
            <p style="margin:0;font-size:11px;color:#c4c4c4;text-align:center">comprimeme.vercel.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Servicio de correo no configurado (falta RESEND_API_KEY)." },
        { status: 500, headers: withCors({}, req) }
      );
    }

    if (!process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "ADMIN_TOKEN no está configurado en el servidor." },
        { status: 500, headers: withCors({}, req) }
      );
    }

    const headerToken = req.headers.get("x-admin-token");
    const body = await req.json().catch(() => ({}));
    const bodyToken = body?.token;
    const token = headerToken || bodyToken;

    if (!token || !isValidToken(token, process.env.ADMIN_TOKEN)) {
      return NextResponse.json(
        { error: "Token de administrador no válido." },
        { status: 403, headers: withCors({}, req) }
      );
    }

    const subject =
      typeof body?.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!subject || !message) {
      return NextResponse.json(
        { error: "El asunto y el mensaje son obligatorios." },
        { status: 400, headers: withCors({}, req) }
      );
    }

    const emails = await redis.smembers(SUBSCRIBERS_KEY);

    if (!emails || emails.length === 0) {
      return NextResponse.json(
        { ok: true, total: 0, sent: 0, failed: 0, failedEmails: [] },
        { headers: withCors({}, req) }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildHtml(subject, message);

    const BATCH_SIZE = 100;
    const failedEmails: string[] = [];
    let sent = 0;

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const payload = batch.map((email) => ({
        from: "COMPRIMEME <onboarding@resend.dev>",
        to: email,
        subject,
        html,
      }));

      try {
        const { data, error } = await resend.batch.send(payload);
        if (error) {
          // Si el batch completo falla, márcalos todos como fallidos
          failedEmails.push(...batch);
        } else {
          // Resend devuelve un resultado por email en el mismo orden que se envió
          data?.data?.forEach((result, idx) => {
            if (result?.id) {
              sent++;
            } else {
              failedEmails.push(batch[idx]);
            }
          });
        }
      } catch {
        failedEmails.push(...batch);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        total: emails.length,
        sent,
        failed: failedEmails.length,
        failedEmails,
      },
      { headers: withCors({}, req) }
    );
  } catch (err: unknown) {
    console.error("notify error:", err);
    return NextResponse.json(
      { error: "Error interno al enviar avisos." },
      { status: 500, headers: withCors({}, req) }
    );
  }
}
