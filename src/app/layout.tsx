import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/ThemeProvider";
import CookieConsent from "@/components/CookieConsent";

// Fuente del logo: Outfit (800)
const outfit = Outfit({
  variable: "--font-logo-outfit",
  subsets: ["latin"],
  weight: "800",
});

// Fuente principal de la app (carácter tech/gaming)
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COMPRIMEME — Comprime imágenes y PDF gratis",
  description: "Comprime imágenes (JPG, PNG, WebP) y PDFs gratis y sin subir archivos a servidores. 100% en tu navegador.",
  keywords: ["comprimir imagen", "comprimir pdf", "reducir tamaño", "compresor gratis"],
  openGraph: {
    title: "COMPRIMEME — Comprime imágenes y PDF gratis",
    description: "Comprime imágenes y PDFs gratis, sin subir archivos a servidores. 100% en tu navegador.",
    type: "website",
    url: "https://comprimeme.vercel.app",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 632,
        alt: "COMPRIMEME — Comprime imágenes y PDF gratis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "COMPRIMEME — Comprime imágenes y PDF gratis",
    description: "Comprime imágenes y PDFs gratis, sin subir archivos a servidores.",
    images: ["/og-default.jpg"],
  },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Compresor",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${outfit.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica el tema antes del primer paint para evitar parpadeo (FOUC):
            lee 'comprimeme-theme' de localStorage o, si no existe, prefers-color-scheme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
      >
        <ThemeProvider>
          <div id="theme-fade-overlay" aria-hidden="true" className="theme-fade-overlay" />
          <ServiceWorkerRegister />
          {children}
          <CookieConsent />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
