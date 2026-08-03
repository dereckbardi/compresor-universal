import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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
    title: "COMPRIMEME",
    description: "Comprime imágenes y PDFs gratis, sin subir archivos.",
    type: "website",
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
      className={`${outfit.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
