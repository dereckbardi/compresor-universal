"use client";

import { motion, AnimatePresence } from "framer-motion";

/** Fade + slide para el contenido que cambia entre herramientas */
export function ToolTransition({ mode, children }: { mode: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Hero con entrada suave */
export function HeroFade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Resultado que aparece con efecto de aparición */
export function ResultPop({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
