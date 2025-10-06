'use client';

import React, { useRef, useState, useEffect } from 'react';

type GenResult = { alt_text: string; tags: string[] };

export default function HomePage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Nettoyage URL d’aperçu
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function isImage(file: File) {
    return /^image\/(png|jpe?g|webp|gif|bmp|tiff|svg\+xml)$/.test(file.type);
  }

  function validateFile(file: File): string | null {
    if (!isImage(file)) return "Format non supporté. Utilisez JPG, PNG ou WEBP.";
    if (file.size > 5 * 1024 * 1024) return "Fichier trop volumineux (max 5 Mo).";
    return null;
  }

  async function handleFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      setResult(null);
      return;
    }

    setBusy(true);
    setResult(null);
    setErrorMsg(null);
    setFileName(file.name);

    // aperçu
    const url = URL.createObjectURL(file);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data?.error) {
        setErrorMsg(data?.error ?? "Erreur temporaire. Merci de réessayer.");
        setResult(null);
        return;
      }
      setResult(data as GenResult);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur réseau. Vérifiez votre connexion puis réessayez.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function downloadCSV() {
    if (!result) return;
    const rows = [
      ["filename", "alt", "tags"],
      [fileName ?? "image", result.alt_text, result.tags.join("|")],
    ];
    const csv = rows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (fileName ?? "alt-tags") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* TOP NAV */}
      <div className="border-b border-slate-200">
        <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 grid place-items-center text-white font-bold">T</div>
            <span className="font-semibold">Tagos.io</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#why" className="hover:text-indigo-600">Pourquoi</a>
            <a href="#how" className="hover:text-indigo-600">Comment</a>
            <a href="#pricing" className="hover:text-indigo-600">Tarifs</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
            <a href="#try" className="btn btn-primary">Essayer</a>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              Optimisation d’images par IA
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              La visibilité, <span className="text-indigo-600">automatisée</span>.
            </h1>
            <p className="mt-4 text-slate-600 text-lg sm:text-xl">
              Tagos optimise vos images pour le référencement grâce à l’IA.
              Balises, textes alternatifs et mots-clés générés instantanément — sans effort, sans plugin.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#try" className="btn btn-primary w-full sm:w-auto">🚀 Générer mes tags</a>
              <a href="#how" className="btn w-full sm:w-auto">Comment ça marche</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Pas de compte • Essai gratuit • Aucune image stockée</p>
          </div>

          <div className="card p-5 bg-gradient-to-b from-slate-50 to-white">
            <div className="text-sm font-medium mb-2">Exemple de sortie</div>
            <div className="text-sm">
              <span className="font-semibold">ALT :</span>{" "}
              <span className="text-slate-700">Chaussures en cuir noir pour homme sur fond blanc</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["chaussures","cuir","noir","homme","mode"].map((t,i)=>
                <span key={i} className="chip">{t}</span>
              )}
            </div>
            <div className="mt-4 text-xs text-slate-500">Généré par IA — format court et descriptif</div>
          </div>
        </div>
      </header>

      {/* TRUST STRIP */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2"><span className="chip">RGPD</span> Aucune image conservée</div>
          <div className="flex items-center gap-2"><span className="chip">Compatibilité</span> WordPress · Shopify · Webflow</div>
          <div className="flex items-center gap-2"><span className="chip">Qualité</span> ALT concis & descriptifs</div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Pourquoi choisir Tagos</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="card p-4">
            <div className="text-base font-medium mb-1">Visibilité</div>
            Descriptions intelligentes pour de meilleures positions sur Google Images et la recherche visuelle.
          </div>
          <div className="card p-4">
            <div className="text-base font-medium mb-1">Gain de temps</div>
            Générez automatiquement l’ALT et 3–5 mots-clés pertinents au lieu d’écrire à la main.
          </div>
          <div className="card p-4">
            <div className="text-base font-medium mb-1">Accessibilité</div>
            Un ALT clair rend vos contenus accessibles à tous les utilisateurs.
          </div>
        </div>
      </section>

      {/* TOOL — zone pro */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-5">Essayez maintenant</h2>

        {/* Dropzone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            "rounded-xl border-2 border-dashed p-6 transition",
            dragging ? "border-indigo-400 bg-indigo-50/40" : "border-slate-300 bg-white"
          ].join(" ")}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="font-medium">Glissez une image ici</div>
              <div className="text-xs text-slate-500 mt-1">ou</div>
              <button
                onClick={() => inputRef.current?.click()}
                className="btn mt-2"
                type="button"
              >
                Choisir un fichier
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              disabled={busy}
              className="hidden"
            />

            {previewUrl && (
              <div className="w-full sm:w-auto">
                <img
                  src={previewUrl}
                  alt="aperçu"
                  className="h-28 w-28 object-cover rounded-lg border border-slate-200 mx-auto"
                />
                <p className="mt-2 text-[11px] text-slate-500 text-center truncate max-w-[11rem]">
                  {fileName}
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Formats : JPG, PNG, WEBP — Taille max : 5 Mo. Aucune image n’est conservée.
          </p>
        </div>

        {busy && (
          <div className="mt-4 animate-pulse card p-5 bg-slate-50 text-slate-400 text-sm">
            Génération en cours...
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 card border border-rose-200 bg-rose-50 text-rose-700 text-sm p-4">
            {errorMsg}
          </div>
        )}

        {result && !errorMsg && (
          <div className="mt-5 card p-5">
            <div className="text-sm">
              <strong>ALT :</strong> {result.alt_text}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.tags.map((tag, i) => (
                <span key={i} className="chip">{tag}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => copy(result.alt_text)} className="btn">Copier l’ALT</button>
              <button onClick={() => copy(result.tags.join(', '))} className="btn">Copier les tags</button>
              <button onClick={downloadCSV} className="btn">Exporter en CSV</button>
            </div>
          </div>
        )}
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Comment ça marche</h2>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="card p-4"><div className="text-2xl mb-1">1</div>Téléversez vos images (JPG, PNG, WEBP).</li>
          <li className="card p-4"><div className="text-2xl mb-1">2</div>L’IA génère un ALT court + 3–5 tags pertinents.</li>
          <li className="card p-4"><div className="text-2xl mb-1">3</div>Copiez ou exportez un CSV pour votre CMS.</li>
        </ol>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6">Tarifs simples</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="text-lg font-semibold">Gratuit</div>
            <div className="mt-1 text-slate-500 text-sm">Pour tester et usages ponctuels</div>
            <div className="mt-4 text-3xl font-extrabold">0 €</div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• 10 images / jour</li>
              <li>• ALT + 3–5 tags</li>
              <li>• Export CSV</li>
            </ul>
            <a href="#try" className="btn btn-primary mt-6 inline-block">Commencer</a>
          </div>
          <div className="card p-6 border-indigo-200">
            <div className="text-lg font-semibold">Pro</div>
            <div className="mt-1 text-slate-500 text-sm">Pour sites & boutiques en croissance</div>
            <div className="mt-4 text-3xl font-extrabold">9 € <span className="text-base font-normal text-slate-500">/ 500 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 500 images</li>
              <li>• Mots-clés étendus (jusqu’à 8)</li>
              <li>• Support prioritaire</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Pro%20-%20Me%20prévenir"
               className="btn mt-6 inline-block">Me prévenir</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">FAQ</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="card p-4">
            <div className="font-medium mb-1">Stockez-vous mes images ?</div>
            Non. Les fichiers sont traités puis immédiatement supprimés.
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">Est-ce compatible avec mon CMS ?</div>
            Oui : WordPress, Shopify, Webflow… Copiez/collez ou exportez en CSV.
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">Quelles langues ?</div>
            Français dès maintenant. Anglais et Espagnol arrivent.
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">Limites d’upload ?</div>
            Jusqu’à 5 Mo par image. Préférez JPG/WEBP optimisés.
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-4 py-10 border-t border-slate-200 text-sm text-slate-500">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <p>© 2025 Tagos.io — Tous droits réservés.</p>
          <div className="flex gap-3">
            <a href="/privacy" className="hover:text-slate-700">Confidentialité</a>
            <a href="/legal" className="hover:text-slate-700">Mentions légales</a>
            <a href="/terms" className="hover:text-slate-700">Conditions</a>
            <a href="mailto:contact@tagos.io" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
            }
