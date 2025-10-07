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

  // Limite gratuite (3 images / jour)
  function canUseToday(limit = 3) {
    try {
      const key = "tagos-quota";
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(key);
      const data = raw ? (JSON.parse(raw) as { d: string; c: number }) : { d: today, c: 0 };
      if (data.d !== today) {
        localStorage.setItem(key, JSON.stringify({ d: today, c: 0 }));
        return true;
      }
      return data.c < limit;
    } catch {
      return true;
    }
  }
  function bumpUse() {
    try {
      const key = "tagos-quota";
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(key);
      const data = raw ? (JSON.parse(raw) as { d: string; c: number }) : { d: today, c: 0 };
      const next = data.d === today ? { d: today, c: data.c + 1 } : { d: today, c: 1 };
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
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

    if (!canUseToday(3)) {
      setErrorMsg("Limite atteinte : 3 images gratuites par jour. Passez au pack 300 pour continuer sans limite quotidienne.");
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
      const data = (await res.json()) as GenResult | { error?: string };

      if (!res.ok || (data as any)?.error) {
        setErrorMsg((data as any)?.error ?? "Erreur temporaire. Merci de réessayer.");
        setResult(null);
        return;
      }

      const safe = data as GenResult;
      setResult({
        alt_text: String(safe.alt_text || 'Image de produit sur fond clair'),
        tags: Array.isArray(safe.tags) ? safe.tags.map(String) : ['produit', 'photo', 'web'],
      });

      bumpUse();
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
    if (file) void handleFile(file);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }

  // Toast copie
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    const el = document.createElement('div');
    el.textContent = 'Copié ✅';
    el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
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
  }

  // Capture email (sans backend) – affiche un toast
  function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      alert('Veuillez saisir un email valide.');
      return;
    }
    e.currentTarget.reset();
    const el = document.createElement('div');
    el.textContent = 'Merci ! Nous vous recontactons très vite.';
    el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      {/* TOP NAV */}
      <div className="border-b border-slate-200/70 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-40">
        <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20 grid place-items-center text-white font-bold">T</div>
            <span className="font-semibold">Tagos.io</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#why" className="hover:text-indigo-600">Pourquoi</a>
            <a href="#before-after" className="hover:text-indigo-600">Avant/Après</a>
            <a href="#usecases" className="hover:text-indigo-600">Cas d’usage</a>
            <a href="#pricing" className="hover:text-indigo-600">Tarifs</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
            <a href="#try" className="btn btn-primary shadow-md shadow-indigo-600/20">Essayer</a>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              Rendez vos images visibles
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Des images que Google comprend.
            </h1>
            <p className="mt-4 text-slate-600 text-lg sm:text-xl">
              Tagos transforme vos visuels en contenu lisible pour les moteurs : texte alternatif clair,
              mots-clés pertinents et nom de fichier optimisé — en quelques secondes.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#try" className="btn btn-primary w-full sm:w-auto shadow-md shadow-indigo-600/20">🚀 Optimiser mes images</a>
              <a href="#how" className="btn w-full sm:w-auto">Comment ça marche</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Aucune inscription • 3 images gratuites/jour • Fichiers non stockés</p>
          </div>

          <div className="card p-6 bg-white/80 backdrop-blur shadow-lg">
            <div className="text-sm font-medium mb-2">Avant / Après (exemple)</div>
            <div className="text-sm mb-2">
              <span className="font-semibold">Nom fichier :</span>{" "}
              <span className="text-slate-700 line-through decoration-rose-400 decoration-2">IMG_1023.jpg</span>{" "}
              <span className="mx-1">→</span>
              <span className="text-slate-800 font-medium">bague-or-rose-diamant-femme.jpg</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">ALT :</span>{" "}
              <span className="text-slate-700">Bague en or rose sertie d’un diamant pour femme sur fond neutre</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["bague","or-rose","diamant","femme","bijoux"].map((t,i)=>
                <span key={i} className="chip">{t}</span>
              )}
            </div>
            <div className="mt-4 text-xs text-slate-500">Résultat prêt à indexer et accessible</div>
          </div>
        </div>
      </header>

      {/* STRIP CONFIANCE — version sans logos de marques */}
      <section className="bg-white/60 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid sm:grid-cols-3 gap-6 text-sm text-slate-700">
            <div className="flex items-center gap-3">
              <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">✓</span>
              <div>
                <div className="font-medium">Confidentialité</div>
                <div className="text-xs text-slate-500">Aucune image conservée</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">⚙</span>
              <div>
                <div className="font-medium">Compatible CMS</div>
                <div className="text-xs text-slate-500">WordPress • Shopify • Webflow • PrestaShop</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">★</span>
              <div>
                <div className="font-medium">Qualité</div>
                <div className="text-xs text-slate-500">ALT concis, mots-clés pertinents</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Pourquoi vos images n’apparaissent pas sur Google ?</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Images “muettes”</div>
            Sans ALT, nom clair ni mots-clés, une image est invisible pour les moteurs de recherche.
          </div>
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Accessibilité oubliée</div>
            Les lecteurs d’écran ne peuvent pas décrire vos visuels sans texte alternatif.
          </div>
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Temps perdu</div>
            Écrire tout à la main est long et rarement fait. Tagos l’automatise proprement.
          </div>
        </div>
      </section>

      {/* AVANT / APRÈS visuel démo */}
      <section id="before-after" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6 text-center">Avant / Après : impact immédiat</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div className="card p-5 shadow-md">
            <div className="text-slate-500 text-xs mb-2">Avant</div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <div className="h-40 rounded-md bg-slate-200 grid place-items-center text-slate-500">Image</div>
              <div className="mt-3 text-xs text-slate-500">ALT manquant · Nom de fichier générique</div>
              <div className="mt-1 text-[11px] text-slate-400">IMG_3456.png</div>
            </div>
          </div>
          <div className="card p-5 shadow-md">
            <div className="text-slate-500 text-xs mb-2">Après Tagos</div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="h-40 rounded-md bg-slate-100 grid place-items-center text-slate-500">Image</div>
              <div className="mt-3 text-xs text-slate-600"><b>ALT :</b> Chaise design en bois clair pour salle à manger</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["chaise","bois-clair","design","salle-a-manger","mobilier"].map((t,i)=><span key={i} className="chip">{t}</span>)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">chaise-design-bois-clair-salle-a-manger.jpg</div>
            </div>
          </div>
        </div>
      </section>

      {/* CAS D’USAGE */}
      <section id="usecases" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Conçu pour vos usages</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">E-commerce</div>
            Catégories, fiches produit, variations — normalisez vos visuels pour la recherche d’images et Google Shopping.
          </div>
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Immobilier</div>
            Vues intérieure/extérieure, pièces et caractéristiques. Facilitez la découverte de vos annonces.
          </div>
          <div className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Blogs & Médias</div>
            Illustrations, tutoriels, comparatifs — chaque image devient une entrée de trafic potentiel.
          </div>
        </div>
      </section>

      {/* OUTIL */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-5 text-center">Essayez maintenant</h2>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            "rounded-2xl border-2 border-dashed p-8 transition shadow-sm mx-auto max-w-3xl",
            dragging ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 bg-white"
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
                  className="h-28 w-28 object-cover rounded-xl border border-slate-200 shadow"
                />
                <p className="mt-2 text-[11px] text-slate-500 text-center truncate max-w-[11rem]">
                  {fileName}
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500 text-center">
            JPG, PNG, WEBP — 5&nbsp;Mo max. Les fichiers ne sont pas conservés.
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
          <div className="mt-5 card border border-rose-200 bg-rose-50 text-rose-700 text-sm p-4 mx-auto max-w-3xl">
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
              <button onClick={() => copy(result.alt_text)} className="btn">Copier l’ALT</button>
              <button onClick={() => copy(result.tags.join(', '))} className="btn">Copier les mots-clés</button>
              <button onClick={downloadCSV} className="btn">Exporter en CSV</button>
              <button onClick={downloadRenamed} className="btn btn-primary shadow-md shadow-indigo-600/20">Télécharger l’image renommée</button>
            </div>
            <p className="mt-3 text-[12px] text-slate-500">
              Astuce : renommez vos fichiers avec une description claire. Les CMS et Google comprennent mieux le contenu.
            </p>
          </div>
        )}
      </section>

      {/* TÉMOIGNAGES */}
      <section id="testimonials" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Ils ont amélioré la visibilité de leurs images</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div className="card p-5 shadow-md">
            <div className="text-slate-700">“On a normalisé 800 photos produits en une journée. Le gain de temps est fou.”</div>
            <div className="mt-3 text-xs text-slate-500">— Marine, E-commerce</div>
          </div>
          <div className="card p-5 shadow-md">
            <div className="text-slate-700">“Les ALT sont propres, courts, et nos pages passent mieux en accessibilité.”</div>
            <div className="mt-3 text-xs text-slate-500">— Karim, Agence Web</div>
          </div>
          <div className="card p-5 shadow-md">
            <div className="text-slate-700">“On a enfin une méthode simple pour nommer correctement nos visuels.”</div>
            <div className="mt-3 text-xs text-slate-500">— Léa, Média en ligne</div>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center">3 étapes pour rendre vos images visibles</h2>
        <ol className="grid sm:grid-cols-3 gap-6 text-sm">
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">1</div>Téléversez vos images (JPG, PNG, WEBP).</li>
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">2</div>Un texte alternatif clair, des mots-clés et un nom de fichier optimisé sont générés.</li>
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">3</div>Copiez, exportez en CSV ou téléchargez l’image renommée.</li>
        </ol>
      </section>

      {/* TARIFS */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6 text-center">Des tarifs simples, sans abonnement</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Essai gratuit</div>
            <div className="mt-1 text-slate-500 text-sm">Pour tester la qualité</div>
            <div className="mt-4 text-3xl font-extrabold">3 / jour</div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• ALT + mots-clés</li>
              <li>• Export CSV</li>
              <li>• Image renommée</li>
            </ul>
            <a href="#try" className="btn btn-primary mt-6 inline-block">Essayer</a>
          </div>

          <div className="card p-6 shadow-lg border-indigo-200">
            <div className="text-lg font-semibold">Starter</div>
            <div className="mt-1 text-slate-500 text-sm">Pour petits sites</div>
            <div className="mt-4 text-3xl font-extrabold">7 € <span className="text-base font-normal text-slate-500">/ 300 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 300 images</li>
              <li>• Mots-clés étendus (jusqu’à 8)</li>
              <li>• Import / export CSV</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Starter%20-%20Me%20prévenir" className="btn mt-6 inline-block">Me prévenir</a>
          </div>

          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Pro</div>
            <div className="mt-1 text-slate-500 text-sm">Pour e-commerce</div>
            <div className="mt-4 text-3xl font-extrabold">19 € <span className="text-base font-normal text-slate-500">/ 1500 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 1 500 images</li>
              <li>• Fichiers multiples & API</li>
              <li>• Support prioritaire</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Pro%20-%20Me%20prévenir" className="btn mt-6 inline-block">Me prévenir</a>
          </div>

          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Agence</div>
            <div className="mt-1 text-slate-500 text-sm">Pour gros volumes</div>
            <div className="mt-4 text-3xl font-extrabold">49 € <span className="text-base font-normal text-slate-500">/ 5000 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• 5 000 images</li>
              <li>• API & intégrations</li>
              <li>• SLA & support dédié</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Agence%20-%20Contact" className="btn mt-6 inline-block">Contacter</a>
          </div>
        </div>
      </section>

      {/* CAPTURE EMAIL */}
      <section id="newsletter" className="mx-auto max-w-4xl px-4 py-12">
        <div className="card p-6 shadow-md bg-gradient-to-br from-indigo-50 to-white">
          <h3 className="text-lg font-semibold">Recevoir les nouveautés & accès API</h3>
          <p className="text-sm text-slate-600 mt-1">Inscrivez-vous pour être averti dès l’ouverture des packs payants et des intégrations CMS.</p>
          <form className="mt-4 flex flex-col sm:flex-row gap-3" onSubmit={handleLeadSubmit}>
            <input
              name="email"
              type="email"
              required
              placeholder="mon.email@domaine.com"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Votre email"
            />
            <button type="submit" className="btn btn-primary">Me tenir au courant</button>
          </form>
          <p className="text-[11px] text-slate-500 mt-2">En vous inscrivant, vous acceptez d’être contacté au sujet de Tagos. Désinscription à tout moment.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center">FAQ</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Stockez-vous mes images ?</div>
            Non. Les fichiers sont traités en mémoire puis supprimés immédiatement.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Est-ce compatible avec mon CMS ?</div>
            Oui : WordPress, Shopify, Webflow… Copiez/collez, export CSV, ou utilisez l’image renommée.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Langues disponibles</div>
            Français dès maintenant. Anglais et Espagnol arrivent.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Limites d’upload</div>
            Jusqu’à 5 Mo par image. Préférez JPG / WEBP optimisés.
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
