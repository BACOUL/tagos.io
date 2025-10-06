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
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

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

  // Sanitize pour un nom de fichier SEO propre
  function slugify(input: string) {
    return input
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
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
    setOriginalFile(file);

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

      // Nettoyage sortie (TYPES FIXÉS ICI)
      const alt = String(data.alt_text ?? '').trim();
      const tagsArr: unknown[] = Array.isArray(data.tags) ? data.tags : [];
      const uniqueTags: string[] = [...new Set(
        tagsArr.map((t) => String(t).trim()).filter(Boolean)
      )].slice(0, 8);

      setResult({
        alt_text: alt || 'Image de produit sur fond clair',
        tags: uniqueTags.length ? uniqueTags : ['produit', 'photo', 'web'],
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur réseau. Vérifiez votre connexion puis réessayez.");
      setResult(null);
    } finally {
      setBusy(false);
      // reset input pour permettre le même fichier à nouveau
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!busy) setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }

  // Accessibilité : déposer via clavier (Entrée/Espace)
  function onDropzoneKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (busy) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  // Toast copie
  function toast(msg: string) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast('Copié ✅'));
  }

  // Téléchargement du fichier renommé (même contenu, nom optimisé SEO)
  function downloadRenamed() {
    if (!originalFile || !result) return;
    const extMatch = (originalFile.name.match(/\.[a-zA-Z0-9]+$/) || [''])[0] || '.jpg';
    const cleanBase = slugify(result.alt_text || 'image-optimisee');
    const newName = `${cleanBase}${extMatch}`;
    const url = URL.createObjectURL(originalFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = newName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Image renommée téléchargée ✅');
  }

  // Export CSV (filename, alt, tags)
  function downloadCSV() {
    if (!result) return;
    const rows = [
      ["filename", "alt", "tags"],
      [fileName ?? "image", result.alt_text, result.tags.join("|")],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (fileName ? fileName.replace(/\.[^.]+$/, '') : "alt-tags") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('CSV exporté ✅');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      {/* TOP NAV */}
      <div className="border-b border-slate-200/70 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20 grid place-items-center text-white font-bold">T</div>
            <span className="font-semibold">Tagos.io</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#why" className="hover:text-indigo-600">Pourquoi</a>
            <a href="#how" className="hover:text-indigo-600">Comment</a>
            <a href="#pricing" className="hover:text-indigo-600">Tarifs</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
            <a href="#try" className="btn btn-primary shadow-md shadow-indigo-600/20">Essayer</a>
          </div>
        </nav>
      </div>

      {/* HERO — sans mention d'IA */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              Optimisation d’images, automatiquement
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              La visibilité, <span className="text-indigo-600">automatisée</span>.
            </h1>
            <p className="mt-4 text-slate-600 text-lg sm:text-xl">
              Générez des textes alternatifs clairs et des mots-clés pertinents pour vos images.
              Exportez, copiez, ou téléchargez votre fichier renommé immédiatement.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#try" className="btn btn-primary w-full sm:w-auto shadow-md shadow-indigo-600/20">🚀 Générer mes tags</a>
              <a href="#how" className="btn w-full sm:w-auto">Comment ça marche</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Pas de compte • Essai gratuit • Aucune image conservée</p>
          </div>

          {/* Simulation d’extrait Google Images */}
          <div className="card p-6 bg-white/80 backdrop-blur shadow-lg">
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
            <div className="mt-4 text-xs text-slate-500">Format court, descriptif et prêt pour le SEO</div>

            <div className="mt-5 rounded-lg border border-slate-200 p-3">
              <div className="text-[11px] text-slate-500 mb-1">Aperçu Google Images</div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md bg-slate-100 grid place-items-center text-[10px] text-slate-500">img</div>
                <div className="min-w-0">
                  <div className="text-sm truncate">chaussures-cuir-noir-homme.jpg</div>
                  <div className="text-[12px] text-slate-500 truncate">Chaussures en cuir noir pour homme sur fond blanc</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TRUST STRIP */}
      <section className="bg-white/60 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2"><span className="chip">Confidentialité</span> Aucune image conservée</div>
          <div className="flex items-center gap-2"><span className="chip">Compatibilité</span> WordPress · Shopify · Webflow</div>
          <div className="flex items-center gap-2"><span className="chip">Qualité</span> ALT concis & descriptifs</div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center">Pourquoi choisir Tagos</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Meilleure visibilité</div>
            Descriptions pertinentes améliorent vos positions sur Google Images et la recherche visuelle.
          </div>
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Gain de temps</div>
            Évitez d’écrire les ALT à la main et industrialisez la mise à jour de votre médiathèque.
          </div>
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Accessibilité</div>
            Un texte alternatif clair aide tous vos visiteurs et respecte les bonnes pratiques.
          </div>
        </div>
      </section>

      {/* TOOL */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-5 text-center">Essayez maintenant</h2>

        <div
          ref={dropRef}
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt pour téléverser une image"
          onKeyDown={onDropzoneKey}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            "rounded-2xl border-2 border-dashed p-8 transition shadow-sm mx-auto max-w-3xl outline-none",
            dragging ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 bg-white",
            busy ? "opacity-70 pointer-events-none" : ""
          ].join(" ")}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="font-medium text-slate-900">Glissez une image ici</div>
              <div className="text-xs text-slate-500 mt-1">ou</div>
              <button
                onClick={() => inputRef.current?.click()}
                className="btn mt-2"
                type="button"
                disabled={busy}
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
                  alt="Aperçu du fichier sélectionné"
                  className="h-28 w-28 object-cover rounded-xl border border-slate-200 shadow"
                />
                <p className="mt-2 text-[11px] text-slate-500 text-center truncate max-w-[11rem]">
                  {fileName}
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500 text-center">
            Formats : JPG, PNG, WEBP — Taille max : 5 Mo. Aucune image n’est conservée.
          </p>
        </div>

        {busy && (
          <div className="mt-5 card p-5 text-sm flex items-center gap-3 mx-auto max-w-3xl" role="status" aria-live="polite">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin"></span>
            Génération en cours…
            <span className="sr-only">Veuillez patienter, génération en cours</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-5 card border border-rose-200 bg-rose-50 text-rose-700 text-sm p-4 mx-auto max-w-3xl" role="alert">
            {errorMsg}
          </div>
        )}

        {result && !errorMsg && (
          <div className="mt-6 card p-6 shadow-lg mx-auto max-w-3xl">
            <div className="text-sm leading-relaxed">
              <strong>ALT :</strong> {result.alt_text}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.tags.map((tag, i) => (
                <span key={i} className="chip">{tag}</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => copy(result.alt_text)} className="btn" type="button">Copier l’ALT</button>
              <button onClick={() => copy(result.tags.join(', '))} className="btn" type="button">Copier les tags</button>
              <button onClick={downloadCSV} className="btn" type="button">Exporter en CSV</button>
              <button onClick={downloadRenamed} className="btn btn-primary shadow-md shadow-indigo-600/20" type="button">
                Télécharger l’image renommée
              </button>
            </div>
            <p className="mt-3 text-[12px] text-slate-500">
              Astuce : renommez vos fichiers avec une description claire. Les CMS comprennent mieux le contenu.
            </p>
          </div>
        )}
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center">Comment ça marche</h2>
        <ol className="grid sm:grid-cols-3 gap-6 text-sm">
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">1</div>Téléversez vos images (JPG, PNG, WEBP).</li>
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">2</div>Un texte alternatif clair + 3–5 mots-clés sont générés.</li>
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">3</div>Copiez, exportez en CSV ou téléchargez l’image renommée.</li>
        </ol>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6 text-center">Tarifs simples</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Gratuit</div>
            <div className="mt-1 text-slate-500 text-sm">Pour tester rapidement</div>
            <div className="mt-4 text-3xl font-extrabold">0 €</div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• 10 images / jour</li>
              <li>• ALT + 3–5 mots-clés</li>
              <li>• Export CSV + image renommée</li>
            </ul>
            <a href="#try" className="btn btn-primary mt-6 inline-block">Commencer</a>
          </div>

          <div className="card p-6 shadow-lg border-indigo-200">
            <div className="text-lg font-semibold">Starter</div>
            <div className="mt-1 text-slate-500 text-sm">Pour sites en croissance</div>
            <div className="mt-4 text-3xl font-extrabold">7 € <span className="text-base font-normal text-slate-500">/ 300 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 300 images</li>
              <li>• Mots-clés étendus (jusqu’à 8)</li>
              <li>• Import/export CSV</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Starter%20-%20Me%20prévenir" className="btn mt-6 inline-block">Me prévenir</a>
          </div>

          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Pro</div>
            <div className="mt-1 text-slate-500 text-sm">Pour catalogues & e-commerce</div>
            <div className="mt-4 text-3xl font-extrabold">19 € <span className="text-base font-normal text-slate-500">/ 1 500 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 1 500 images</li>
              <li>• Fichiers multiples & API</li>
              <li>• Support prioritaire</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Pro%20-%20Me%20prévenir" className="btn mt-6 inline-block">Me prévenir</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center">FAQ</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Stockez-vous mes images ?</div>
            Non. Les fichiers sont traités puis immédiatement supprimés.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Est-ce compatible avec mon CMS ?</div>
            Oui : WordPress, Shopify, Webflow… Copiez/collez, export CSV, ou fichier renommé.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Quelles langues ?</div>
            Français dès maintenant. Anglais et Espagnol arrivent.
          </div>
          <div className="card p-5 shadow-sm">
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
