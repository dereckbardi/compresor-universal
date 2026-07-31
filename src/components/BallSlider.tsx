"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: "orange" | "white";
}

/** Selector de bolitas que reemplaza al slider de rayita */
export default function BallSlider({ value, onChange, min = 10, max = 100, step = 10, color = "orange" }: Props) {
  const values: number[] = [];
  for (let v = min; v <= max; v += step) values.push(v);

  return (
    <div className="flex justify-between gap-1">
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
            ? "bg-white shadow-lg scale-110"
            : passed
            ? "bg-white/50 hover:bg-white/70"
            : "bg-neutral-700 hover:bg-neutral-600";
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`h-6 flex-1 rounded-full transition ${c}`}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}
