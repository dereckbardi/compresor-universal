"use client";

import Link from "next/link";
import { TOOLS, CATEGORIES } from "@/lib/tools";

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-black text-sm">C</span>
            <span className="font-semibold tracking-widest text-sm">COMPRIMEME</span>
          </Link>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition">
            ← Volver
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Todas las herramientas</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Gestiona tus PDF e imágenes con estas herramientas. 100% gratis y sin registro.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.category === cat.id);
            return (
              <div key={cat.id} className="bg-neutral-900/60 rounded-2xl p-5 border border-white/5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
                  {cat.name}
                </h2>
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <Link
                      key={tool.id}
                      href={tool.available ? `/?tool=${tool.id}` : "#"}
                      onClick={tool.available ? undefined : (e) => e.preventDefault()}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${
                        tool.available
                          ? "hover:bg-white/5 cursor-pointer"
                          : "opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                        tool.available ? "bg-orange-500/15 text-orange-400" : "bg-neutral-800 text-neutral-600"
                      }`}>
                        {tool.icon}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${tool.available ? "text-white" : "text-neutral-500"}`}>
                          {tool.name}
                        </p>
                        <p className="text-xs text-neutral-500 leading-relaxed">{tool.desc}</p>
                      </div>
                      {!tool.available && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-neutral-600 border border-neutral-700 rounded-full px-2 py-0.5 shrink-0">Pronto</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-neutral-600">
          <p>COMPRIMEME — 100% gratis y sin registro.</p>
        </div>
      </footer>
    </main>
  );
}
