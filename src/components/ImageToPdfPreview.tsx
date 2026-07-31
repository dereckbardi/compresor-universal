"use client";

import { useState } from "react";

// Page sizes in points (w x h)
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A4: { w: 595.28, h: 841.89 },
  A5: { w: 419.53, h: 595.28 },
  Letter: { w: 612, h: 792 },
  Legal: { w: 612, h: 1008 },
};

const MARGINS: Record<string, number> = {
  none: 0,
  small: 24,
  large: 48,
};

const PREVIEW_WIDTH = 260;

interface Props {
  file: File;
  pageSize?: string;
  orientation?: "portrait" | "landscape";
  margin?: string;
  compact?: boolean;
}

export default function ImageToPdfPreview({ file, pageSize = "A4", orientation = "portrait", margin = "none", compact = false }: Props) {
  const [imgSrc] = useState(() => URL.createObjectURL(file));
  const [imgAspect, setImgAspect] = useState(1.4);

  const base = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const pw = orientation === "landscape" ? base.h : base.w;
  const ph = orientation === "landscape" ? base.w : base.h;
  const m = MARGINS[margin] ?? 0;

  // Preview box width: full (260) or compact (150)
  const boxW = compact ? 150 : PREVIEW_WIDTH;
  const previewH = boxW * (ph / pw);

  // Fit image inside available area (points), preserving aspect
  const availW = pw - 2 * m;
  const availH = ph - 2 * m;
  let imgW = availW;
  let imgH = availW / imgAspect;
  if (imgH > availH) {
    imgH = availH;
    imgW = imgH * imgAspect;
  }
  const scale = boxW / pw;
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  return (
    <div className="flex flex-col items-center gap-1">
      <img src={imgSrc} alt="" className="hidden" onLoad={(e) => {
        const n = e.currentTarget.naturalWidth, h = e.currentTarget.naturalHeight;
        if (n && h) setImgAspect(n / h);
      }} />
      <div
        className="relative bg-white rounded-lg overflow-hidden"
        style={{ width: boxW, height: previewH }}
      >
        {/* Page with margin area */}
        <div className="absolute inset-0" style={{ padding: m * scale, background: "#fafafa" }}>
          <div className="w-full h-full flex items-center justify-center bg-white">
            <img
              src={imgSrc}
              alt=""
              style={{ width: drawW, height: drawH, objectFit: "fill" }}
            />
          </div>
        </div>
      </div>
      {!compact && <p className="text-xs text-neutral-500">Vista previa en vivo</p>}
    </div>
  );
}
