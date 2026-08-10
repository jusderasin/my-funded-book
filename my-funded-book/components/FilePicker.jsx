"use client";

import { useRef, useState, useEffect } from "react";
import { UploadCloud, X, FileText } from "lucide-react";

export function FilePicker({ accept = "image/*", value, existingUrl, onChange, onRemove, hint }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (value && value.type && value.type.startsWith("image/")) {
      const u = URL.createObjectURL(value);
      setPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreview(null);
  }, [value]);

  const isPdf =
    (value && value.type === "application/pdf") ||
    (!value && existingUrl && /\.pdf($|\?)/i.test(existingUrl));
  const imgSrc = preview || (!value && existingUrl && !isPdf ? existingUrl : null);
  const has = !!value || !!existingUrl;

  return (
    <div>
      {has ? (
        <div className="relative overflow-hidden rounded-xl border border-line2 bg-panel2">
          {isPdf ? (
            <div className="flex items-center gap-2 p-3 text-[13px] text-white/85">
              <FileText size={18} className="text-accent" />
              {value ? value.name : "Document PDF"}
            </div>
          ) : (
            <img src={imgSrc || ""} alt="aperçu" className="max-h-56 w-full bg-black/30 object-contain" />
          )}
          <button
            type="button"
            onClick={() => {
              onRemove && onRemove();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute right-2 top-2 rounded-lg bg-black/70 p-1 text-white hover:bg-loss"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current && inputRef.current.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line2 bg-panel2 py-6 text-muted transition hover:border-accent hover:text-white"
        >
          <UploadCloud size={22} />
          <span className="text-[12.5px] font-semibold">Choisir un fichier</span>
          {hint && <span className="text-[11px] text-muted2">{hint}</span>}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) onChange(f);
        }}
      />
    </div>
  );
}
