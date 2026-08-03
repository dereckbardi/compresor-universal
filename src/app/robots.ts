import type { MetadataRoute } from "next";

// Ver la nota sobre NEXT_PUBLIC_SITE_URL en src/app/sitemap.ts
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://comprimeme-956795747152.us-central1.run.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
