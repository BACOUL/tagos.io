"use client";
import { useState } from "react";

export default function Home() {
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [lang, setLang] = useState("fr");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await fileToBase64(f);
    setPreview(URL.createObjectURL(f));
    setLoading(true);
    setAlt(""); setTags([]);

    const res = await fetch("/api/caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: b64, lang })
    });
    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setAlt("Erreur: " + (data.error || "inconnue"));
      return;
    }
    setAlt(data.alt_text || "");
    setTags(data.tags || []);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-3xl font-bold">Tagos.io — ALT SEO auto</h1>
        <p className="text-sm opacity-80">
          Uploade une image → on génère un texte alternatif optimisé SEO + 5 tags.
        </p>

        <div className="flex items-center gap-3">
          <label className="text-sm">Langue</label>
          <select value={lang} onChange={e=>setLang(e.target.value)} className="border rounded px-2 py-1">
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <input type="file" accept="image/*" onChange={onFile} className="block" />

        {preview && (
          <img src={preview} alt="preview" className="w-full rounded border" />
        )}

        <div className="border rounded p-3 bg-gray-50">
          {loading ? "Analyse en cours…" : (
            <>
              <div className="font-semibold">ALT proposé :</div>
              <div className="mt-1">{alt || "—"}</div>
              <div className="mt-3 font-semibold">Tags :</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags?.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 border rounded">{t}</span>
                ))}
                {!tags?.length && <span className="text-xs opacity-60">—</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.split(",")[1] || ""); // on conserve uniquement le base64
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
              }
