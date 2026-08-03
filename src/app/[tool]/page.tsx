import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompressorApp from "@/components/CompressorApp";
import { TOOL_CONTENT, getModeBySlug, type Mode } from "@/lib/toolContent";

/**
 * Página SEO individual por herramienta (ej. /comprimir-pdf, /unir-pdf).
 * Reutiliza el mismo componente que la home (@/components/CompressorApp),
 * solo que le indica con qué herramienta abrir de entrada mediante initialMode.
 * Esto hace que el <h1> correcto ya venga en el HTML generado por el servidor
 * (sin depender de JavaScript ni de un parámetro ?tool= en la URL), y que cada
 * herramienta tenga su propio <title>/<meta description> indexable por Google.
 */

interface Props {
  params: Promise<{ tool: string }>;
}

// Pre-renderiza en build time una página estática por cada herramienta.
export function generateStaticParams() {
  return (Object.values(TOOL_CONTENT) as { slug: string }[]).map((content) => ({
    tool: content.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const mode = getModeBySlug(tool);
  if (!mode) return {};

  const content = TOOL_CONTENT[mode];
  const title = `${content.title} gratis, sin registro | COMPRIMEME`;
  const description = `${content.desc} 100% gratis, sin registro, sin límites y sin subir tus archivos a servidores.`;

  return {
    title,
    description,
    alternates: { canonical: `/${content.slug}` },
    openGraph: { title: content.title, description: content.desc, type: "website" },
    twitter: { card: "summary", title: content.title, description: content.desc },
  };
}

export default async function ToolPage({ params }: Props) {
  const { tool } = await params;
  const mode: Mode | null = getModeBySlug(tool);
  if (!mode) notFound();

  return <CompressorApp initialMode={mode} />;
}
