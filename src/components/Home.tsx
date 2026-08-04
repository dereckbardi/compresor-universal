"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Browser,
  Check,
  CheckCircle,
  DownloadSimple,
  Files,
  Image as ImageIcon,
  Infinity,
  Lightning,
  LockSimple,
  PaperPlaneTilt,
  Plus,
  Quotes,
  Scissors,
  ShieldCheck,
  SquaresFour,
  UploadSimple,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { TOOLS, TOOL_ICONS, type Tool } from "@/lib/tools";
import { TOOL_CONTENT, type Mode } from "@/lib/toolContent";

const POPULAR_TOOLS = TOOLS.filter((t) => t.popular && t.available);

const BENEFITS: { icon: React.ReactNode; title: string; text: string }[] = [
  { icon: <Check size={22} weight="bold" />, title: "Gratis", text: "Sin costes ni suscripciones ocultas." },
  { icon: <ShieldCheck size={22} weight="bold" />, title: "Sin registro", text: "No pedimos tu cuenta ni tus datos." },
  { icon: <Browser size={22} weight="bold" />, title: "En tu navegador", text: "Tus archivos no salen de tu dispositivo." },
  { icon: <Infinity size={22} weight="bold" />, title: "Ilimitado", text: "Comprime todos los archivos que quieras." },
];

const STEPS: { icon: Icon; number: string; title: string; text: string }[] = [
  {
    icon: UploadSimple,
    number: "1",
    title: "Sube tu archivo",
    text: "Elige la imagen o el PDF desde tu dispositivo y listo.",
  },
  {
    icon: Lightning,
    number: "2",
    title: "Compresión instantánea",
    text: "Comprimimos al instante, todo dentro de tu navegador.",
  },
  {
    icon: DownloadSimple,
    number: "3",
    title: "Descárgalo",
    text: "Guarda el archivo ligero y compártelo sin problemas.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Me encanta, comprime en segundos y gratis.",
    name: "María G.",
    role: "Usuaria de COMPRIMEME",
  },
  {
    quote: "Justo lo que necesitaba, sin registro.",
    name: "Carlos R.",
    role: "Usuario de COMPRIMEME",
  },
  {
    quote: "Rapidísimo y sin subir mis archivos a ningún lado.",
    name: "Ana L.",
    role: "Usuaria de COMPRIMEME",
  },
];

const FAQS = [
  {
    q: "¿Es gratis?",
    a: "Sí, COMPRIMEME es 100% gratis: sin costes ocultos, sin suscripciones y sin límites de uso.",
  },
  {
    q: "¿Mis archivos se suben a algún servidor?",
    a: "No. Todo el proceso ocurre en tu navegador y tus archivos nunca salen de tu dispositivo.",
  },
  {
    q: "¿Qué formatos soporta?",
    a: "Comprimimos imágenes (JPG, PNG, WebP) y PDF. Estamos añadiendo más formatos poco a poco.",
  },
  {
    q: "¿Necesito registrarme?",
    a: "No. No pedimos cuenta, correo ni ningún dato personal: abres la página y listo.",
  },
  {
    q: "¿Qué pasa con mi privacidad?",
    a: "Nada se sube a ningún servidor, así que tus archivos no se almacenan ni se comparten. Tú tienes el control.",
  },
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
                className="btn-shine min-h-12 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-orange-500 text-black font-semibold hover:bg-orange-400 transition"
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
        <Reveal>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Herramientas más populares</h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Las favoritas para aligerar tus archivos en segundos.
            </p>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_TOOLS.map((tool) => (
            <StaggerItem key={tool.id} className="h-full">
              <PopularCard tool={tool} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Beneficios */}
      <section className="border-y border-neutral-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal>
          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {BENEFITS.map((b) => (
              <StaggerItem key={b.title}>
                <div className="text-center">
                  <span className="mx-auto w-12 h-12 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    {b.icon}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{b.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{b.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal>
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cómo funciona</h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Tres pasos y tu archivo estará listo en segundos.
            </p>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((step) => (
            <StaggerItem key={step.number} className="h-full">
              <StepCard step={step} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Testimonios */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-neutral-200 dark:border-white/10">
        <Reveal>
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Lo que dicen quienes lo usan
            </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Opiniones de quienes comprimen sus archivos cada día.
            </p>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name} className="h-full">
              <TestimonialCard t={t} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Preguntas frecuentes */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal>
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Resolvemos las dudas más habituales sobre COMPRIMEME.
            </p>
          </div>
          <FaqAccordion />
        </Reveal>
      </section>

      {/* CTA final */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal delay={0.05}>
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/25 bg-gradient-to-br from-orange-500/15 via-transparent to-amber-400/10 px-6 sm:px-12 py-12 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              ¿Listo para comprimir tus archivos?
            </h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
              Rápido, privado y gratis. Tus archivos se procesan en tu navegador.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/comprimir-imagenes"
                className="btn-shine min-h-12 inline-flex items-center justify-center gap-2 px-7 rounded-xl bg-orange-500 text-black font-semibold hover:bg-orange-400 transition"
              >
                Empezar a comprimir ahora
                <ArrowRight size={18} weight="bold" />
              </Link>
              <Link
                href="/tools"
                className="min-h-12 inline-flex items-center justify-center gap-2 px-7 rounded-xl border border-neutral-200 dark:border-white/10 hover:border-orange-500/60 text-neutral-900 dark:text-white font-semibold transition"
              >
                Ver todas las herramientas
                <ArrowUpRight size={18} weight="bold" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Suscripción */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal delay={0.05}>
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
        </Reveal>
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

function StepCard({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative h-full flex flex-col items-center rounded-2xl border border-neutral-200 dark:border-white/10 hover:border-orange-500/70 p-6 pt-5 text-center transition-colors"
    >
      <span className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center">
        {step.number}
      </span>
      <span className="mt-4 w-12 h-12 rounded-full bg-orange-500 text-black flex items-center justify-center shadow-lg shadow-orange-500/20">
        <step.icon size={24} weight="bold" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {step.text}
      </p>
    </motion.div>
  );
}

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full flex flex-col rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 shadow-sm hover:shadow-lg hover:shadow-orange-500/15 transition-shadow"
    >
      <Quotes size={28} weight="fill" className="text-orange-500" aria-hidden="true" />
      <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {t.quote}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-sm font-bold flex items-center justify-center">
          {t.name.charAt(0)}
        </span>
        <div>
          <p className="text-sm font-semibold">{t.name}</p>
          <p className="text-xs text-neutral-500">{t.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((faq, i) => (
        <FaqItem
          key={faq.q}
          faq={faq}
          index={i}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}

function FaqItem({
  faq,
  index,
  open,
  onToggle,
}: {
  faq: (typeof FAQS)[number];
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const id = `faq-${index}`;

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        id={`${id}-button`}
        className="min-h-12 w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-3 text-left text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-white/5 transition"
      >
        <span>{faq.q}</span>
        <span className="relative w-8 h-8 shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "x" : "plus"}
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center"
            >
              {open ? <X size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            aria-labelledby={`${id}-button`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="px-4 sm:px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
