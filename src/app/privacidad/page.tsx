"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const SERVER_TOOLS = ["WORD a PDF", "POWERPOINT a PDF", "EXCEL a PDF", "PDF a WORD", "PDF a POWERPOINT", "PDF a EXCEL", "HTML a PDF", "Proteger PDF", "Desbloquear PDF", "PDF a PDF/A"];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white antialiased selection:bg-orange-500/30 overflow-x-clip">
      {/* Header */}
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Política de privacidad</h1>
        <p className="text-sm text-neutral-500 mb-10">Última actualización: 6 de agosto de 2026</p>

        <div className="space-y-10 text-neutral-700 dark:text-neutral-300 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">1. Resumen</h2>
            <p>
              En COMPRIMEME nos tomamos tu privacidad muy en serio. Nuestro diseño está pensado para que{" "}
              <strong>la mayoría de tus archivos nunca salgan de tu dispositivo</strong>: se procesan directamente en tu
              navegador. Esta política explica de forma clara qué datos tratamos y por qué.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2. Procesamiento de tus archivos</h2>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-4 mb-2">a) Herramientas 100% locales</h3>
            <p>
              La gran mayoría de nuestras herramientas (comprimir PDF, comprimir imágenes, unir, dividir, rotar, extraer
              imágenes, PDF a JPG/PNG/WebP/TIFF, PDF a texto, contador de palabras, PDF a Zip, escala de grises, etc.)
              procesan tus archivos <strong>directamente en tu navegador</strong>. En estos casos, tus archivos{" "}
              <strong>no se suben a ningún servidor</strong> ni se almacenan en ningún sitio: todo ocurre en tu equipo y se
              elimina al cerrar la pestaña.
            </p>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-4 mb-2">b) Herramientas con conversión en servidor</h3>
            <p>
              Algunas conversiones requieren un servidor para garantizar la máxima fidelidad del resultado. Estas son:{" "}
              {SERVER_TOOLS.join(", ")}.
            </p>
            <p className="mt-2">
              En estos casos, tu archivo se envía de forma <strong>temporal y cifrada (HTTPS)</strong> a nuestro servidor,
              se procesa y <strong>se elimina de forma automática</strong> en cuanto termina la conversión. No guardamos
              copias ni accedemos al contenido de tus documentos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">3. Datos que recopilamos</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Datos de uso anónimos</strong>: utilizamos Vercel Analytics para entender qué herramientas se usan más, de forma agregada y sin identificar a usuarios concretos.</li>
              <li><strong>Correo (opcional)</strong>: si te suscribes a novedades, guardamos tu dirección de correo únicamente para enviarte actualizaciones. Puedes darte de baja en cualquier momento.</li>
              <li><strong>Preferencias locales</strong>: tu tema (claro/oscuro) y ajustes se guardan en tu navegador (localStorage) y no se transmiten a servidores.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">4. Cookies y almacenamiento</h2>
            <p>
              No utilizamos cookies de seguimiento de terceros para publicidad. Usamos almacenamiento local del navegador
              (localStorage) exclusivamente para recordar preferencias como el tema. No vendemos ni compartimos tus datos
              con terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">5. Seguridad</h2>
            <p>
              Las comunicaciones con nuestro servidor se realizan mediante conexiones cifradas (HTTPS). Los archivos que se
              procesan en el servidor se mantienen en memoria solo durante el tiempo necesario y se eliminan
              automáticamente al finalizar, sin dejar copias en disco.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">6. Enlaces a terceros</h2>
            <p>
              Nuestro sitio puede contener enlaces a otros sitios web. No somos responsables de las prácticas de privacidad
              de esos sitios. Te recomendamos revisar sus políticas antes de facilitarles información.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">7. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política de vez en cuando. Cualquier cambio se publicará en esta página con la fecha de
              última actualización. Te recomendamos revisarla periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">8. Contacto</h2>
            <p>
              Si tienes preguntas sobre esta política o sobre cómo tratamos tus datos, puedes contactarnos a través de la
              información de contacto publicada en la web.
            </p>
          </section>

          <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              ¿Quieres saber más sobre qué hace COMPRIMEME? Visita nuestra página{" "}
              <Link href="/acerca" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                Acerca de
              </Link>{" "}
              o explora{" "}
              <Link href="/tools" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                todas las herramientas
              </Link>
              .
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-neutral-200 dark:border-white/10 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-neutral-600 dark:text-neutral-400">
          <p className="mb-2">COMPRIMEME — 100% gratis y sin registro.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/acerca" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Acerca de</Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacidad" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Política de privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
