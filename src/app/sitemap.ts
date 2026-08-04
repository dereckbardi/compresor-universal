import type { MetadataRoute } from "next";
import { TOOL_CONTENT } from "@/lib/toolContent";

/**
 * IMPORTANTE: cuando compres el dominio propio, actualiza esta URL (o mejor,
 * define la variable de entorno NEXT_PUBLIC_SITE_URL en Vercel con el dominio
 * nuevo) para que el sitemap y las URLs canónicas apunten ahí.
 *
 * Ahora el frontend está en Vercel, así que el default es comprimeme.vercel.app.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://comprimeme.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPages: MetadataRoute.Sitemap = Object.values(TOOL_CONTENT).map((content) => ({
    url: `${BASE_URL}/${content.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/tools`, changeFrequency: "weekly", priority: 0.6 },
    ...toolPages,
  ];
}
