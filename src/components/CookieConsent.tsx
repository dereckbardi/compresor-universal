"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "@phosphor-icons/react";

/**
 * Banner de consentimiento de cookies.
 * - Sin cookies de seguimiento hoy: solo recuerda la preferencia del usuario
 *   en localStorage ('comprimeme-consent') para no volver a preguntar.
 * - Cuando se active AdSense / cookies de terceros, el estado guardado permite
 *   saber si el usuario aceptó, rechazó o aún no decide, y se puede usar con el
 *   Consent Mode de Google.
 */
const CONSENT_KEY = "comprimeme-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // localStorage no disponible
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4"
    >
      <div className="max-w-3xl mx-auto rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Cookie size={22} weight="bold" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">Usamos cookies</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Utilizamos almacenamiento local para recordar preferencias (como tu tema). Si más adelante activamos
              publicidad, usaremos cookies de terceros solo si las aceptas. Consulta nuestra{" "}
              <Link href="/privacidad" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                Política de privacidad
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="min-h-11 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition"
          >
            Solo lo esencial
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="min-h-11 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition"
          >
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  );
}
