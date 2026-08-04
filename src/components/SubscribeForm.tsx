"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface SubscribeFormProps {
  title?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}

export default function SubscribeForm({
  title = "¿Quieres enterarte de las novedades?",
  subtitle,
  className,
  compact = false,
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Oculta el mensaje de éxito/error tras 5s con animación de salida.
  useEffect(() => {
    if (status === "ok" || status === "error") {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setStatus("idle");
        setErrorMsg("");
      }, 5000);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [status]);

  // Efecto magnético: el botón sigue sutilmente el cursor (respeta reduced-motion)
  const reducedMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 300, damping: 20 });
  const springY = useSpring(my, { stiffness: 300, damping: 20 });

  function handleMagneticMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = Math.max(-18, Math.min(18, (e.clientX - (rect.left + rect.width / 2)) * 0.4));
    const offsetY = Math.max(-18, Math.min(18, (e.clientY - (rect.top + rect.height / 2)) * 0.4));
    mx.set(offsetX);
    my.set(offsetY);
  }

  function handleMagneticLeave() {
    mx.set(0);
    my.set(0);
  }

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
    <div className={`${compact ? "text-center" : "max-w-xl mx-auto text-center"} ${className ?? ""}`}>
      {!compact && (
        <>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-3 text-neutral-600 dark:text-neutral-400">{subtitle}</p>
          )}
        </>
      )}
      {compact && subtitle && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{subtitle}</p>
      )}
      <form onSubmit={handleSubmit} className={compact ? "" : "mt-8"} noValidate>
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
          <motion.button
            type="submit"
            disabled={status === "sending"}
            style={reducedMotion ? undefined : { x: springX, y: springY }}
            onMouseMove={handleMagneticMove}
            onMouseLeave={handleMagneticLeave}
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
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {status === "ok" && (
            <motion.p
              key="ok"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-4 text-sm text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2"
              aria-live="polite"
            >
              <CheckCircle size={18} weight="bold" className="text-orange-500" />
              ¡Gracias! Te avisaremos cuando haya novedades.
            </motion.p>
          )}
          {status === "error" && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-4 text-sm text-red-600 dark:text-red-400"
              role="alert"
              aria-live="polite"
            >
              {errorMsg}
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
