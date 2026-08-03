import type { MetadataRoute } from "next";
import { TOOL_CONTENT } from "@/lib/toolContent";

/**
 * IMPORTANTE: cuando compres el dominio propio, actualiza esta URL (o mejor,
 * define la variable de entorno NEXT_PUBLIC_SITE_URL en Cloud Run con el
 * dominio nuevo) para que el sitemap y las URLs canónicas apunten ahí en vez
 * de al dominio temporal de Cloud Run.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://comprimeme-956795747152.us-central1.run.app";

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
