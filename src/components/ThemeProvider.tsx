"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "comprimeme-theme";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

/** Tema inicial: localStorage ('comprimeme-theme') o, si no existe, prefers-color-scheme. */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage no disponible
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  // Mantiene la clase .dark en <html> sincronizada y guarda en localStorage.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage no disponible
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      // Transición suave de colores SOLO al cambiar (no en carga inicial).
      const root = document.documentElement;
      root.classList.add("theme-anim");
      window.setTimeout(() => root.classList.remove("theme-anim"), 400);
      // Overlay glassmorphism: fundido de vidrio esmerilado para una transición
      // de tema más cinematográfica.
      const overlay = document.getElementById("theme-fade-overlay");
      if (overlay) {
        overlay.classList.remove("theme-fade-active");
        void overlay.offsetWidth; // reinicia la animación
        overlay.classList.add("theme-fade-active");
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
