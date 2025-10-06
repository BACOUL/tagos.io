"use client";

import { useEffect, useMemo, useState } from "react";

type CaptionResp = { alt_text: string; tags: string[] } | { error: string };

export default function Home() {
  // UI state
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Options
  const [lang, setLang] = useState<"fr" | "en" | "es">("fr");
  const [style, setStyle] = useState<"neutral" | "ecommerce" | "editorial">("neutral");

  // Freemium compteur navigateur
  const MAX_FREE = 20;
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const used = Number(localStorage.getItem("free_uses") || "0");
    setLeft(Math.max(0, MAX_FREE - used));
  }, []);

  function decFree() {
    const used = Number(localStorage.getItem("free_uses") || "0") + 1;
    localStorage.setItem("free_uses", String(used));
    setLeft(Math.max(0, MAX_FREE - used));
  }

  // Helpers
  const canGenerate = useMemo(() => left > 0, [left]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const f = e.target.files?.[0];
    if (!f) return;

    // Validation basique
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(f.type);
    if (!okType) {
      setErr("Formats acceptés : JPG, PNG, WEBP");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr("Image trop lourde (> 5 Mo)");
      return;
    }
    if (!canGenerate) {
      setErr("Crédits gratuits épuisés. Achetez un pack pour continuer.");
      return;
    }

    // Preview locale
    setPreview(URL.createObjectURL(f));

    // Convert to base64 (data payload seulement)
    const b64 = await fileToBase64(f);
    await generateAlt(b64);
  }

  async function generateAlt(imageBase64: string) {
    try {
      setLoading(true);
      setAlt("");
      setTags([]);
      setErr(null);

      const r = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, lang, style }),
      });

      const j: CaptionResp = await r.json();
      setLoading(false);

      if (!r.ok || "error" in j) {
        setErr(("error" in j ? j.error : "Erreur serveur") || "Erreur inconnue");
        return;
      }

      setAlt(j.alt_text || "");
      setTags(Array.isArray(j.tags) ? j.tags : []);

      // décrémente l’essai gratuit (côté navigateur)
      decFree();
    } catch (e: any) {
      setLoading(false);
      setErr(e?.message || "Erreur réseau");
    }
  }

  async function handleCheckout() {
    try {
      const r = await fetch("/api/checkout", { method: "POST" });
      const j = await r.json();
      if (j.url) window.location.href = j.url;
      else alert(j.error || "Impossible d'ouvrir le paiement");
    } catch {
      alert("Erreur de paiement");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Tagos.io — ALT SEO automatique</h1>
          <p className="text-sm text-gray-600 mt-1">
            Uploade une image → reçois un texte alternatif optimisé SEO + 5 tags. 20 essais gratuits.
          </p>
        </header>

        {/* Controls */}
        <section className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm w-20">Langue</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="w-full border rounded px-2 py-1 bg-white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm w-20">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as any)}
              className="w-full border rounded px-2 py-1 bg-white"
            >
              <option value="neutral">Neutre</option>
              <option value="ecommerce">E-commerce</option>
              <option value="editorial">Éditorial</option>
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-end">
            <span className="text-xs text-gray-600">Essais restants : <b>{left}</b></span>
          </div>
        </section>

        {/* Uploader */}
        <section className="mb-4">
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-black file:px-4 file:py-2 file:text-white file:hover:opacity-90"
          />
          <p className="text-xs text-gray-500 mt-2">Formats acceptés : JPG, PNG, WEBP — max 5 Mo.</p>
        </section>

        {/* Preview */}
        {preview && (
          <section className="mb-4">
            <img src={preview} alt="preview" className="w-full rounded border" />
          </section>
        )}

        {/* Result card */}
        <section className="bg-white border rounded p-4">
          {loading ? (
            <div className="animate-pulse text-gray-600">Analyse en cours…</div>
          ) : err ? (
            <div className="text-red-600 text-sm">{err}</div>
          ) : (
            <>
              <div className="font-semibold">ALT proposé :</div>
              <div className="mt-1 break-words">{alt || "—"}</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(alt)}
                  className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                  disabled={!alt}
                >
                  Copier l’ALT
                </button>
              </div>

              <div className="mt-4 font-semibold">Tags :</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {tags?.length ? (
                  tags.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 border rounded bg-gray-50">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </div>
              <div className="mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(tags.join(", "))}
                  className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                  disabled={!tags.length}
                >
                  Copier les tags (CSV)
                </button>
              </div>
            </>
          )}
        </section>

        {/* Checkout */}
        <section className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <button
            onClick={handleCheckout}
            className="inline-flex items-center justify-center rounded bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Acheter 10 000 crédits (10 €)
          </button>
          <p className="text-xs text-gray-600">
            Besoin de plus ? Packs Pro et Enterprise sur demande.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-500">
          Made with ❤️ — Tagos.io
        </footer>
      </div>
    </main>
  );
}

// Utils
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      // on ne garde que la partie base64 après la virgule
      resolve(s.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
    }
