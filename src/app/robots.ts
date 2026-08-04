import type { MetadataRoute } from "next";

// Ver la nota sobre NEXT_PUBLIC_SITE_URL en src/app/sitemap.ts
// El frontend está en Vercel: default a comprimeme.vercel.app
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://comprimeme.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
