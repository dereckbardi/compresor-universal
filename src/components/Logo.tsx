// Logo.tsx — Wordmark de Comprímeme
// Ícono (círculo + flechas de compresión) reemplaza la "O".
// Animación al cargar: el ícono entra "comprimiéndose" (grande -> tamaño final, con rebote).
// Fuente: placeholder por ahora (herencia del body) — pendiente definir, no convenció Pirata One.

'use client'

export default function Logo({ size = 2.25 }: { size?: number }) {
 return (
 <div className="logo-wrap">
 <span className="logo-text" style={{ fontSize: `${size}rem`, fontFamily: "var(--font-logo-outfit)" }}>
 C
 <span className="logo-icon" aria-hidden="true">
 <svg viewBox="0 0 24 24" fill="none">
 <path d="M3 12 L9 6 L9 18 Z" fill="currentColor" />
 <path d="M21 12 L15 6 L15 18 Z" fill="currentColor" />
 </svg>
 </span>
 mprímeme
 </span>

 <style jsx>{`
 .logo-wrap {
 display: inline-flex;
 align-items: center;
 }
 .logo-text {
 display: inline-flex;
 align-items: center;
 font-weight: 800;
 font-size: 2.25rem;
 letter-spacing: 0.01em;
 color: var(--ink, #f97316);
 }
 .logo-icon {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 width: 0.62em;
 height: 0.62em;
 margin: 0 0.03em;
 border: 3px solid var(--accent, #f97316);
 border-radius: 50%;
 color: #0a0b0d;
 background: var(--accent, #f97316);
 position: relative;
 top: 0.03em;

 /* animación de carga: entra grande y "se comprime" a su tamaño final */
 animation: logo-compress 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both;
 }
 .logo-icon svg {
 width: 52%;
 height: 52%;
 }

 /* respiración continua sutil, después de la animación de entrada */
 .logo-icon {
 animation:
 logo-compress 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both,
 logo-breathe 3s ease-in-out 1s infinite;
 }

 @keyframes logo-compress {
 0% {
 transform: scale(2.4);
 opacity: 0;
 }
 60% {
 transform: scale(0.85);
 opacity: 1;
 }
 100% {
 transform: scale(1);
 }
 }
 @keyframes logo-breathe {
 0%,
 100% {
 transform: scale(1);
 }
 50% {
 transform: scale(0.88);
 }
 }

 /* respeta a usuarios que piden menos movimiento */
 @media (prefers-reduced-motion: reduce) {
 .logo-icon {
 animation: none;
 }
 }
 `}</style>
 </div>
 )
}
