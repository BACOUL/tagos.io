"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [lang, setLang] = useState("fr");
  const [style, setStyle] = useState("neutral");
  const [left, setLeft] = useState(0);
  const MAX_FREE = 20;

  useEffect(() => {
    const used = Number(localStorage.getItem("free_uses") || "0");
    setLeft(Math.max(0, MAX_FREE - used));
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const okType = ["image/jpeg", "image/png", "image/webp"].includes(f.type);
    if (!okType) {
      alert("Formats acceptés: JPG, PNG, WEBP");
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      alert("Image trop lourde (>5 Mo)");
      return;
    }

    if (left <= 0) {
      alert("Crédits gratuits épuisés !");
      return;
    }

    const b64 = await fileToBase64(f);
    setPreview(URL.createObjectURL(f));
    setLoading(true);
    setAlt("");
    setTags([]);

    const res = await fetch("/api/caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: b64, lang, style }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setAlt("Erreur: " + (data.error || "inconnue"));
      return;
    }

    setAlt(data.alt_text || "");
    setTags(data.tags || []);

    const used = Number(localStorage.getItem("free_uses") || "0") + 1;
    localStorage.setItem("free_uses", String(used));
    setLeft(Math.max(0, MAX_FREE - used));
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-3xl font-bold">Tagos.io — ALT SEO auto</h1>
        <p className="text-sm opacity-80">
          Uploade une image → on génère un texte alternatif optimisé SEO + 5 tags.
        </p>

        <div className="flex gap-3">
          <select value={lang} onChange={e => setLang(e.target.value)} className="border rounded px-2 py-1">
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>

          <select value={style} onChange={e => setStyle(e.target.value)} className="border rounded px-2 py-1">
            <option value="neutral">Neutre</option>
            <option value="ecommerce">E-commerce</option>
            <option value="editorial">Éditorial</option>
          </select>
        </div>

        <input type="file" accept="image/*" onChange={onFile} className="block" />

        {preview && (
          <img src={preview} alt="preview" className="w-full rounded border" />
        )}

        <div className="border rounded p-3 bg-white">
          {loading ? (
            "Analyse en cours…"
          ) : (
            <>
              <div className="font-semibold">ALT proposé :</div>
              <div className="mt-1">{alt || "—"}</div>
              <button
                onClick={() => navigator.clipboard.writeText(alt)}
                className="mt-2 px-3 py-1 border rounded"
              >
                Copier l’ALT
              </button>

              <div className="mt-3 font-semibold">Tags :</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags?.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 border rounded">
                    {t}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(tags.join(", "))}
                className="mt-2 px-3 py-1 border rounded"
              >
                Copier les tags
              </button>
            </>
          )}
        </div>

        <div className="text-xs opacity-70">
          Essais restants : {left}
        </div>

        <a
          href="https://buy.stripe.com/test_lien_a_remplacer"
          target="_blank"
          className="inline-block mt-4 px-4 py-2 rounded bg-black text-white"
        >
          Acheter 10 000 crédits (10 €)
        </a>

        <footer className="text-xs text-center opacity-60 mt-8">
          Made with ❤️ by Tagos.io
        </footer>
      </div>
    </main>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
          }
