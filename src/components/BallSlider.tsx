"use client";

import { useRef, useState } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: "orange" | "white";
}

/** Selector de bolitas con soporte de arrastre (drag) */
export default function BallSlider({ value, onChange, min = 10, max = 100, step = 10, color = "orange" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const values: number[] = [];
  for (let v = min; v <= max; v += step) values.push(v);

  // Calcular el valor según la posición horizontal del puntero dentro del contenedor
  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const total = max - min;
    const raw = min + ratio * total;
    const snapped = Math.round(raw / step) * step;
    const clamped = Math.min(max, Math.max(min, snapped));
    onChange(clamped);
  };

  return (
    <div
      ref={ref}
      className={`flex justify-between gap-1 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        setDragging(true);
        // Capturar el puntero en el CONTENEDOR (no en la bolita) para que el arrastre funcione siempre
        ref.current?.setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging) setFromClientX(e.clientX);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {values.map((val) => {
        const active = Math.abs(value - val) < step / 2;
        const passed = val <= value;
        const c =
          color === "orange"
            ? active
              ? "bg-orange-500 shadow-lg shadow-orange-500/40 scale-110"
              : passed
              ? "bg-orange-500/50 hover:bg-orange-500/70"
              : "bg-neutral-700 hover:bg-neutral-600"
            : active
            ? "bg-neutral-800 dark:bg-white shadow-lg scale-110"
            : passed
            ? "bg-neutral-400 dark:bg-white/50 hover:bg-neutral-500 dark:hover:bg-white/70"
            : "bg-neutral-700 hover:bg-neutral-600";
        return (
          <span
            key={val}
            className={`h-6 flex-1 rounded-full transition ${c} pointer-events-none`}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}
