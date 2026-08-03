"use client";

import Logo from "@/components/Logo";

export default function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando Comprímeme"
      className="loading-screen fixed inset-0 z-[999] flex flex-col items-center justify-center gap-10 bg-black text-white select-none"
    >
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute h-36 w-36 rounded-full bg-orange-500/20 blur-3xl"
        />
        <Logo size={2.75} />
      </div>

      {/* Bolita del logo animándose (sin texto) */}
      <div className="flex items-center justify-center">
        <span
          aria-hidden="true"
          className="orb block h-6 w-6 rounded-full bg-orange-500"
        />
      </div>

      <style jsx>{`
        .loading-screen {
          animation: ls-fade 0.4s ease both;
        }
        .orb {
          animation: ls-bounce 1s ease-in-out infinite;
        }
        @keyframes ls-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes ls-bounce {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-14px) scale(0.85);
            opacity: 0.5;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-screen,
          .orb {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
