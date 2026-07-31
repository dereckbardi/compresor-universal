"use client";

import { useEffect, useState } from "react";

export default function PdfPreview({ file, page = 1 }: { file: File; page?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file]);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <iframe
        src={`${url}#page=${page}`}
        title="Vista previa del PDF"
        className="w-full max-w-md h-[500px] rounded-xl bg-white/5 border border-white/10"
      />
    </div>
  );
}
