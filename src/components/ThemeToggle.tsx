"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Botón de cambio de tema (sol/luna). Renderiza ambos iconos y la visibilidad se
 * decide por CSS con la clase .dark, evitando errores de hidratación.
 */
export default function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { toggleTheme } = useTheme();
  const sizes = size === "sm" ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10";
  const iconSize = size === "sm" ? 18 : 20;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
      className={`shrink-0 ${sizes} rounded-lg flex items-center justify-center text-neutral-500 hover:text-orange-500 dark:text-neutral-400 dark:hover:text-white border border-transparent hover:border-orange-500/60 transition`}
    >
      <Sun size={iconSize} weight="bold" className="theme-toggle-icon hidden dark:block" />
      <Moon size={iconSize} weight="bold" className="theme-toggle-icon block dark:hidden" />
    </button>
  );
}
