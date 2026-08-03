"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Trash, X } from "@phosphor-icons/react";

// Fuentes cursivas disponibles en Windows para firmas
const SIGN_FONTS = [
  { name: "Clásica", family: "'Segoe Script', 'Brush Script MT', cursive" },
  { name: "Elegante", family: "'Lucida Handwriting', cursive" },
  { name: "Moderna", family: "'Comic Sans MS', 'Segoe Script', cursive" },
  { name: "Fina", family: "'French Script MT', 'Segoe Script', cursive" },
];

const SIGN_COLORS = [
  { name: "Negro", hex: "#000000" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Verde", hex: "#16a34a" },
];

export interface SignatureResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

interface Props {
  onConfirm: (sig: SignatureResult) => void;
  onCancel: () => void;
}

export default function SignatureModal({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [tab, setTab] = useState<"texto" | "dibujo" | "cargar">("texto");
  const [fontIdx, setFontIdx] = useState(0);
  const [color, setColor] = useState("#000000");
  const [drawEmpty, setDrawEmpty] = useState(true);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [loadedImg, setLoadedImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef2 = useRef<HTMLCanvasElement>(null);

  // Vista previa en vivo
  useEffect(() => {
    const canvas = previewRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (tab === "texto") {
      const text = (name || initials || "Firma").trim();
      ctx.fillStyle = color;
      ctx.font = `500 72px ${SIGN_FONTS[fontIdx].family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    } else if (tab === "dibujo") {
      const src = drawRef.current;
      if (src) ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    } else if (tab === "cargar" && loadedImg) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = loadedImg;
    }
  }, [tab, name, initials, fontIdx, color, drawEmpty, loadedImg]);

  // Dibujo a mano
  const getPos = (e: React.PointerEvent) => {
    const c = drawRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const startDraw = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    const c = drawRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const moveDraw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = drawRef.current!;
    const ctx = c.getContext("2d")!;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDrawEmpty(false);
  };
  const endDraw = () => { drawing.current = false; };
  const clearDraw = () => {
    const c = drawRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDrawEmpty(true);
  };

  // Generar imagen de firma según pestaña
  const generate = (): SignatureResult => {
    const W = 500, H = 180;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    if (tab === "texto") {
      const text = (name || initials || "Firma").trim();
      ctx.fillStyle = color;
      ctx.font = `500 72px ${SIGN_FONTS[fontIdx].family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, W / 2, H / 2);
    } else if (tab === "dibujo") {
      const src = drawRef.current!;
      ctx.drawImage(src, 0, 0, W, H);
    } else if (tab === "cargar" && loadedImg) {
      const img = new Image();
      img.src = loadedImg;
      ctx.drawImage(img, 0, 0, W, H);
    }

    const dataUrl = canvas.toDataURL("image/png");
    return { dataUrl, blob: dataUrlToBlob(dataUrl), width: W, height: H };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Fondo desenfocado */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Firmar</h3>
          <button onClick={onCancel} className="text-neutral-500 hover:text-white text-xl"><X size={18} /></button>
        </div>

        {/* Nombre e iniciales */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Nombre completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Iniciales</label>
            <input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="JP" className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        {/* Pestañas */}
        <div className="grid grid-cols-3 gap-2">
          {[{ id: "texto", l: "Firma" }, { id: "dibujo", l: "Dibujar" }, { id: "cargar", l: "Cargar" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`py-2 rounded-lg border text-sm font-medium transition ${tab === t.id ? "bg-orange-500 text-black border-orange-500" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}>{t.l}</button>
          ))}
        </div>

        {/* Tipo de letra (solo texto) */}
        {tab === "texto" && (
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Tipo de letra</label>
            <div className="grid grid-cols-2 gap-2">
              {SIGN_FONTS.map((f, i) => (
                <button key={f.name} onClick={() => setFontIdx(i)} className={`py-2 rounded-lg border transition ${fontIdx === i ? "border-orange-500 bg-orange-500/10" : "border-neutral-700 hover:border-neutral-500"}`}>
                  <span className="text-lg" style={{ fontFamily: f.family, color }}>{name || "Firma"}</span>
                  <span className="block text-[10px] text-neutral-500">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color */}
        <div>
          <label className="text-xs text-neutral-400 block mb-2">Color</label>
          <div className="flex gap-2">
            {SIGN_COLORS.map((c) => (
              <button key={c.name} onClick={() => setColor(c.hex)} className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${color === c.hex ? "border-orange-500" : "border-neutral-700"}`}>
                <span className="inline-block w-4 h-4 rounded-full align-middle mr-1" style={{ background: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Área de dibujo */}
        {tab === "dibujo" && (
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Dibuja tu firma</label>
            <canvas
              ref={drawRef}
              width={500}
              height={180}
              className="w-full h-40 bg-white rounded-lg cursor-crosshair touch-none"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <button onClick={clearDraw} className="mt-2 text-xs text-neutral-500 hover:text-red-400 transition"><Trash size={14} className="inline-block align-[-2px] mr-1" /> Limpiar</button>
          </div>
        )}

        {/* Cargar firma */}
        {tab === "cargar" && (
          <div>
            <label className="text-xs text-neutral-400 block mb-2">Sube tu firma (PNG con fondo transparente)</label>
            <button onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-lg border border-dashed border-neutral-600 text-sm text-neutral-300 hover:border-orange-500 transition"><Paperclip size={14} className="inline-block align-[-2px] mr-1" /> Cargar imagen de firma</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { const r = new FileReader(); r.onload = () => setLoadedImg(r.result as string); r.readAsDataURL(f); }
              e.target.value = "";
            }} />
            {loadedImg && <img src={loadedImg} alt="firma" className="mt-2 h-24 bg-white rounded-lg object-contain" />}
          </div>
        )}

        {/* Vista previa de la firma */}
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Vista previa</label>
          <div className="border border-neutral-700 rounded-lg p-3 bg-white/5 flex items-center justify-center min-h-20">
            <canvas ref={previewRef2} width={500} height={120} className="max-h-24" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 font-medium transition">Cancelar</button>
          <button
            onClick={() => {
              if (tab === "texto" && !name.trim() && !initials.trim()) return;
              if (tab === "dibujo" && drawEmpty) return;
              if (tab === "cargar" && !loadedImg) return;
              onConfirm(generate());
            }}
            disabled={(tab === "texto" && !name.trim() && !initials.trim()) || (tab === "dibujo" && drawEmpty) || (tab === "cargar" && !loadedImg)}
            className="flex-1 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black font-semibold transition"
          >
            Usar firma
          </button>
        </div>
      </div>
    </div>
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)![1];
  const b64 = atob(parts[1]);
  const arr = new Uint8Array(b64.length);
  for (let i = 0; i < b64.length; i++) arr[i] = b64.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
