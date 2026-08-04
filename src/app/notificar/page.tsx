"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, PaperPlaneRight } from "@phosphor-icons/react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

type Status = "idle" | "sending" | "ok" | "error";

interface NotifyResult {
  total: number;
  sent: number;
  failed: number;
  failedEmails: string[];
  error?: string;
}

export default function NotificarPage() {
  const [token, setToken] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<NotifyResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !token.trim()) return;

    setStatus("sending");
    setResult(null);

    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResult({ total: 0, sent: 0, failed: 0, failedEmails: [], error: data.error });
        return;
      }

      setStatus("ok");
      setResult(data);
    } catch {
      setStatus("error");
      setResult({ total: 0, sent: 0, failed: 0, failedEmails: [], error: "Error de conexión." });
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white antialiased selection:bg-orange-500/30 overflow-x-clip">
      <header className="border-b border-neutral-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={1.3} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">
              <ArrowLeft size={14} weight="bold" />
              Volver
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Enviar aviso
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
          Envía un correo a todos los suscriptores registrados en COMPRIMEME.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="token" className="block text-sm font-medium mb-1.5">
              Token de administrador
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Tu token secreto"
              required
              className="w-full min-h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 px-4 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/60 transition"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
              Asunto
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Nuevas herramientas disponibles"
              required
              className="w-full min-h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 px-4 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/60 transition"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1.5">
              Mensaje
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el contenido del aviso…"
              rows={5}
              required
              className="w-full rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 px-4 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/60 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending" || !token.trim() || !subject.trim() || !message.trim()}
            className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-black font-semibold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition btn-shine"
          >
            {status === "sending" ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <PaperPlaneRight size={18} weight="bold" />
                Enviar a suscriptores
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100/80 dark:bg-neutral-900/60 p-5">
            {status === "ok" ? (
              <div>
                <p className="text-sm font-semibold mb-2">
                  Aviso enviado correctamente
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>Total de suscriptores: <span className="font-medium text-neutral-900 dark:text-white">{result.total}</span></li>
                  <li>Enviados: <span className="font-medium text-green-600 dark:text-green-400">{result.sent}</span></li>
                  <li>Fallidos: <span className="font-medium text-red-600 dark:text-red-400">{result.failed}</span></li>
                </ul>
                {result.failedEmails.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-500 mb-1">Correos con error:</p>
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                      {result.failedEmails.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">
                {result.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100/50 dark:bg-neutral-900/30 p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            El correo se envía desde <span className="font-medium">onboarding@resend.dev</span>.
            Solo llegará a direcciones verificadas en Resend mientras no configures un dominio propio.
          </p>
        </div>
      </div>

      <footer className="border-t border-neutral-200 dark:border-white/10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-neutral-600 dark:text-neutral-400">
          <p>COMPRIMEME — 100% gratis y sin registro.</p>
        </div>
      </footer>
    </main>
  );
}
