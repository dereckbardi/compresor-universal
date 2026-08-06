"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Gauge, FileImage, PuzzlePiece, Globe } from "@phosphor-icons/react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { TOOLS } from "@/lib/tools";

const FEATURES = [
  { icon: Lock, title: "100% en tu navegador", text: "La mayoría de herramientas procesan tus archivos localmente: nunca salen de tu dispositivo." },
  { icon: Gauge, title: "Rápido y sin registro", text: "Sin cuentas, sin instalaciones y sin esperas. Sube, convierte y descarga al instante." },
  { icon: ShieldCheck, title: "Privacidad primero", text: "Como tus archivos no se suben a servidores (salvo las conversiones de Office), nadie más puede verlos." },
  { icon: PuzzlePiece, title: "Siempre en crecimiento", text: `Más de ${TOOLS.filter((t) => t.available).length} herramientas disponibles y sumamos más con frecuencia.` },
];

export default function AboutPage() {
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
        <div className="text-center mb-12">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-orange-500 text-black items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
            <FileImage size={28} weight="bold" />
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Acerca de COMPRIMEME</h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            La forma más sencilla de comprimir y convertir tus PDF e imágenes. Gratis, rápido y sin complicaciones.
          </p>
        </div>

        <div className="space-y-10 text-neutral-700 dark:text-neutral-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">¿Qué es COMPRIMEME?</h2>
            <p>
              COMPRIMEME es una colección de herramientas online pensadas para resolver un problema cotidiano: trabajar
              con PDF e imágenes sin instalar programas ni perder tiempo. Nacimos con un objetivo claro —{" "}
              <strong>comprimir y convertir archivos de forma simple, gratis y respetando tu privacidad</strong> — y desde
              entonces no hemos dejado de crecer.
            </p>
            <p className="mt-3">
              Tenemos herramientas para comprimir PDF e imágenes, unir y dividir PDF, convertir entre formatos (Word,
              PowerPoint, Excel, JPG, PNG, WebP, TIFF, SVG), proteger con contraseña, extraer imágenes, contar palabras y
              mucho más.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Nuestros principios</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-neutral-200 dark:border-white/10 p-5 hover:border-orange-500/50 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                    <f.icon size={20} weight="bold" />
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{f.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">¿Cómo funciona?</h2>
            <p>
              La magia de COMPRIMEME es que <strong>la mayoría de herramientas trabajan directamente en tu navegador</strong>.
              Tus archivos se procesan localmente en tu dispositivo y nunca se suben a nuestros servidores. Esto significa que
              es más rápido, no hay límites de tamaño en la mayoría de casos y —lo más importante— tus documentos
              privados permanecen privados.
            </p>
            <p className="mt-3">
              Solo algunas conversiones (como Word, PowerPoint o Excel a PDF) se procesan en un servidor para garantizar la
              máxima fidelidad del formato. Incluso así, los archivos se eliminan de forma automática al terminar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">¿Es realmente gratis?</h2>
            <p>
              Sí. Todas nuestras herramientas son <strong>100% gratuitas</strong>, sin registro y sin límites ocultos. Queremos
              que cualquiera pueda gestionar sus documentos sin barreras. Nuestro objetivo es ofrecer un servicio tan bueno
              que no tengas que buscar en ningún otro sitio.
            </p>
          </section>

          <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Globe size={20} weight="bold" className="text-orange-500" />
              ¿Tienes dudas o sugerencias?
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Siempre estamos buscando ideas para mejorar. Echa un vistazo a{" "}
              <Link href="/tools" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                todas nuestras herramientas
              </Link>{" "}
              o lee nuestra{" "}
              <Link href="/privacidad" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                Política de privacidad
              </Link>{" "}
              para saber cómo tratamos tus datos.
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
