import { NextRequest, NextResponse } from "next/server";
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

function buildHtml(subject: string, message: string): string {
  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = escaped(message)
    .split("\n")
    .map((l) => `<p style="margin:0 0 8px 0">${l || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#f97316;padding:24px 32px;text-align:center">
            <span style="font-size:20px;font-weight:800;color:#000;letter-spacing:.01em">COMPRIMEME</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#171717">${escaped(subject)}</h1>
            <div style="font-size:15px;line-height:1.6;color:#525252">${lines}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #e5e5e5">
            <p style="margin:0;font-size:12px;color:#a3a3a3;text-align:center">COMPRIMEME — Herramientas gratis para PDF e imágenes</p>
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

    if (!token || token !== process.env.ADMIN_TOKEN) {
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

    const failedEmails: string[] = [];
    let sent = 0;

    for (const email of emails) {
      try {
        await resend.emails.send({
          from: "COMPRIMEME <onboarding@resend.dev>",
          to: email,
          subject,
          html,
        });
        sent++;
      } catch {
        failedEmails.push(email);
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
