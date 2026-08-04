"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Browser,
  Check,
  CheckCircle,
  Files,
  Image as ImageIcon,
  Infinity,
  LockSimple,
  PaperPlaneTilt,
  Scissors,
  ShieldCheck,
  SquaresFour,
  type Icon,
} from "@phosphor-icons/react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { TOOLS, TOOL_ICONS, type Tool } from "@/lib/tools";
import { TOOL_CONTENT, type Mode } from "@/lib/toolContent";

const POPULAR_TOOLS = TOOLS.filter((t) => t.popular && t.available);

const BENEFITS: { icon: React.ReactNode; title: string; text: string }[] = [
  { icon: <Check size={22} weight="bold" />, title: "Gratis", text: "Sin costes ni suscripciones ocultas." },
  { icon: <ShieldCheck size={22} weight="bold" />, title: "Sin registro", text: "No pedimos tu cuenta ni tus datos." },
  { icon: <Browser size={22} weight="bold" />, title: "En tu navegador", text: "Tus archivos no salen de tu dispositivo." },
  { icon: <Infinity size={22} weight="bold" />, title: "Ilimitado", text: "Comprime todos los archivos que quieras." },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ToolIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  const TIcon: Icon | undefined = TOOL_ICONS[icon];
  if (!TIcon) return null;
  return <TIcon size={size} weight="bold" />;
}

function toolHref(id: string): string {
  const content = TOOL_CONTENT[id as Mode];
  return content ? `/${content.slug}` : `/?tool=${id}`;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_REGEX.test(value)) {
      setStatus("error");
      setErrorMsg("Introduce un correo válido, por ejemplo tu@correo.com.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "No pudimos guardar tu correo.");
      }
      setStatus("ok");
      setEmail("");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error && err.message ? err.message : "Algo salió mal. Inténtalo de nuevo."
      );
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white antialiased selection:bg-orange-500/30 overflow-x-clip">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="COMPRIMEME, ir al inicio">
            <Logo size={1.3} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/tools"
              className="btn-shine shrink-0 min-h-11 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition whitespace-nowrap"
              title="Todas las herramientas"
            >
              <SquaresFour size={18} weight="bold" className="sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Todas las herramientas</span>
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-16 sm:pt-24 sm:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Comprime tus archivos{" "}
              <span className="text-orange-500">sin esfuerzo</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed">
              Reduce el peso de tus imágenes y PDF directamente en tu navegador. Rápido, privado y 100% gratis.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/comprimir-imagenes"
                className="min-h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-orange-500 text-black font-semibold hover:bg-orange-400 transition"
              >
                Empezar a comprimir
                <ArrowRight size={18} weight="bold" />
              </Link>
            </div>
          </div>

          {/* Visual decorativo */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
            <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 p-5 sm:p-8 shadow-2xl shadow-orange-500/25">
              <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Files size={20} weight="bold" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">informe-final.pdf</p>
                    <p className="text-xs text-neutral-500">24,6 MB</p>
                  </div>
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">-66%</span>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-neutral-500 mb-2">
                    <span>Comprimiendo…</span>
                    <span>8,3 MB</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            <span className="absolute -top-5 -left-3 sm:-left-6 w-14 h-14 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-lg flex items-center justify-center text-orange-500">
              <ImageIcon size={24} weight="bold" />
            </span>
            <span className="absolute -top-6 right-4 sm:right-8 w-14 h-14 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-lg flex items-center justify-center text-orange-500">
              <Scissors size={24} weight="bold" />
            </span>
            <span className="absolute -bottom-5 -left-2 sm:-left-8 w-14 h-14 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-lg flex items-center justify-center text-orange-500">
              <LockSimple size={24} weight="bold" />
            </span>
            <span className="absolute -bottom-4 right-4 sm:right-6 w-12 h-12 rounded-full bg-orange-500 text-black shadow-lg flex items-center justify-center">
              <ArrowRight size={22} weight="bold" />
            </span>
          </div>
        </div>
      </section>

      {/* Herramientas más populares */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Herramientas más populares</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Las favoritas para aligerar tus archivos en segundos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_TOOLS.map((tool) => (
            <PopularCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="border-y border-neutral-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {BENEFITS.map((b) => (
              <div key={b.title} className="text-center">
                <span className="mx-auto w-12 h-12 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  {b.icon}
                </span>
                <h3 className="mt-4 text-sm font-semibold">{b.title}</h3>
                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suscripción */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">¿Quieres enterarte de las novedades?</h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Suscríbete para recibir nuevas herramientas y mejoras. Sin spam, prometido.
          </p>
          <form onSubmit={handleSubmit} className="mt-8" noValidate>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setStatus("idle");
                  setErrorMsg("");
                }}
                placeholder="tu@correo.com"
                aria-label="Tu correo electrónico"
                className="min-h-12 flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 px-4 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/60 transition"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="min-h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-orange-500 text-black font-semibold hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {status === "sending" ? (
                  "Enviando…"
                ) : (
                  <>
                    Suscribirme
                    <PaperPlaneTilt size={18} weight="bold" />
                  </>
                )}
              </button>
            </div>

            {status === "ok" && (
              <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2">
                <CheckCircle size={18} weight="bold" className="text-orange-500" />
                ¡Gracias! Te avisaremos cuando haya novedades.
              </p>
            )}
            {status === "error" && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {errorMsg}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-neutral-600 dark:text-neutral-400">
          <p>COMPRIMEME — 100% gratis y sin registro.</p>
        </div>
      </footer>
    </main>
  );
}

function PopularCard({ tool }: { tool: Tool }) {
  return (
    <Link href={toolHref(tool.id)} className="group block h-full">
      <div className="h-full rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-white/10 hover:border-orange-500/60 transition flex items-center gap-3 sm:gap-4">
        <span className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
          <ToolIcon icon={tool.icon} size={24} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{tool.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
            {tool.tagline || tool.desc}
          </p>
        </div>
        <ArrowRight
          size={18}
          weight="bold"
          className="shrink-0 text-neutral-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition"
        />
      </div>
    </Link>
  );
}
