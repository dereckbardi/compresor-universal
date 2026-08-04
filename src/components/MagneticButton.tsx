"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * Botón con efecto magnético: sigue sutilmente el cursor al acercarse.
 * Respeta prefers-reduced-motion (en ese caso renderiza un Link normal).
 */
export default function MagneticButton({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className: string;
  href: string;
}) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  if (reducedMotion) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <motion.div
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = Math.max(
          -18,
          Math.min(18, (e.clientX - (rect.left + rect.width / 2)) * 0.4)
        );
        const offsetY = Math.max(
          -18,
          Math.min(18, (e.clientY - (rect.top + rect.height / 2)) * 0.4)
        );
        x.set(offsetX);
        y.set(offsetY);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}
