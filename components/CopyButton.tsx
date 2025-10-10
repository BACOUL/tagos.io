// components/CopyButton.tsx
"use client";
import { useState } from "react";

export default function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    } catch {
      // fallback très simple
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      aria-label={label}
      title={label}
    >
      {ok ? "Copié ✓" : label}
    </button>
  );
}
