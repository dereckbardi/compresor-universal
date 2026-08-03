"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TOOLS, CATEGORIES, type Tool } from "@/lib/tools";
import { TOOL_CONTENT, type Mode } from "@/lib/toolContent";
import Logo from "@/components/Logo";

function toolHref(id: string, available: boolean): string {
  if (!available) return "#";
  const content = TOOL_CONTENT[id as Mode];
  return content ? `/${content.slug}` : `/?tool=${id}`;
}

/** Quita acentos y pasa a minúsculas, para que buscar "compresion" encuentre "compresión". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const POPULAR_TOOLS = TOOLS.filter((t) => t.popular && t.available);

export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalizedQuery = normalize(query.trim());

  const filteredTools = useMemo(() => {
    return TOOLS.filter((t) => {
      if (activeCategory && t.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      return normalize(t.name).includes(normalizedQuery) || normalize(t.desc).includes(normalizedQuery);
    });
  }, [activeCategory, normalizedQuery]);

  const showPopular = !normalizedQuery && !activeCategory;
  const hasResults = filteredTools.length > 0;

  return (
    <main className="min-h-screen bg-black text-white antialiased selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={1.3} />
          </Link>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition">
            ← Volver
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Todas las herramientas</h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Gestiona tus PDF e imágenes con estas herramientas. 100% gratis y sin registro.
          </p>
        </div>

        {/* Buscador */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar una herramienta…"
              className="w-full bg-neutral-900 border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-orange-500/60 transition"
            />
          </div>
        </div>

        {/* Píldoras de categoría */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeCategory === null
                ? "bg-orange-500 text-black"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-white/10"
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory === cat.id
                  ? "bg-orange-500 text-black"
                  : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Más populares (solo cuando no hay búsqueda ni filtro activo) */}
        {showPopular && (
          <div className="mb-14">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
              Más populares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {POPULAR_TOOLS.map((tool) => (
                <ToolCard key={tool.id} tool={tool} featured />
              ))}
            </div>
          </div>
        )}

        {/* Catálogo completo, agrupado por categoría (oculta categorías sin resultados) */}
        {!hasResults ? (
          <div className="text-center py-16">
            <p className="text-neutral-400">
              No encontramos ninguna herramienta con &quot;{query}&quot;.
            </p>
            <button
              onClick={() => { setQuery(""); setActiveCategory(null); }}
              className="mt-4 text-orange-400 hover:text-orange-300 text-sm underline"
            >
              Ver todas las herramientas
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {CATEGORIES.filter((cat) => !activeCategory || cat.id === activeCategory).map((cat) => {
              const tools = filteredTools.filter((t) => t.category === cat.id);
              if (tools.length === 0) return null;
              return (
                <div key={cat.id}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
                    {cat.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-neutral-600">
          <p>COMPRIMEME — 100% gratis y sin registro.</p>
        </div>
      </footer>
    </main>
  );
}

function ToolCard({ tool, featured = false }: { tool: Tool; featured?: boolean }) {
  const content = (
    <div
      className={`h-full rounded-2xl p-5 border transition ${
        tool.available
          ? featured
            ? "bg-gradient-to-br from-orange-500/10 to-neutral-900 border-orange-500/30 hover:border-orange-500/60"
            : "bg-neutral-900/60 border-white/5 hover:border-white/20"
          : "bg-neutral-900/30 border-white/5 opacity-40 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
            tool.available ? "bg-orange-500/15 text-orange-400" : "bg-neutral-800 text-neutral-600"
          }`}
        >
          {tool.icon}
        </span>
        {!tool.available && (
          <span className="ml-auto text-[10px] uppercase tracking-wide text-neutral-600 border border-neutral-700 rounded-full px-2 py-0.5 shrink-0">
            Pronto
          </span>
        )}
      </div>
      <p className={`text-sm font-semibold mb-1 ${tool.available ? "text-white" : "text-neutral-500"}`}>
        {tool.name}
      </p>
      <p className="text-xs text-neutral-500 leading-relaxed">
        {featured && tool.tagline ? tool.tagline : tool.desc}
      </p>
    </div>
  );

  if (!tool.available) {
    return <div>{content}</div>;
  }

  return (
    <Link href={toolHref(tool.id, tool.available)} className="block h-full">
      {content}
    </Link>
  );
}
