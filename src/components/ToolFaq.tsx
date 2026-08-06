import { getFaqs, type Faq } from "@/lib/faq";
import type { Mode } from "@/lib/toolContent";

/**
 * Sección de preguntas frecuentes (FAQ) de una herramienta.
 * Usa <details>/<summary> nativo: accesible, sin JavaScript y perfecto para SEO
 * (el contenido queda en el HTML servido).
 */
export default function ToolFaq({ mode }: { mode: Mode }) {
  const faqs: Faq[] = getFaqs(mode);
  if (faqs.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-center">
        Preguntas frecuentes
      </h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-8">
        Resolvemos las dudas más comunes. ¿Tienes otra? Escríbenos y te ayudamos.
      </p>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden hover:border-orange-500/50 transition-colors"
          >
            <summary className="list-none flex items-center justify-between gap-3 cursor-pointer px-5 py-4 text-sm font-semibold select-none">
              {f.q}
              <span className="shrink-0 text-orange-500 transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <div className="px-5 pb-5 pt-0 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
