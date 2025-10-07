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
    if (!isImage(file)) return 'Format non supporté. Utilisez JPG, PNG ou WEBP.';
    if (file.size > 5 * 1024 * 1024) return 'Fichier trop volumineux (max 5 Mo).';
    return null;
  }

  // Limite gratuite (3 images / jour)
  function canUseToday(limit = 3) {
    try {
      const key = 'tagos-quota';
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
      const key = 'tagos-quota';
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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
      setErrorMsg(
        'Limite atteinte : 3 images gratuites par jour. Passez au pack 300 pour continuer sans limite quotidienne.'
      );
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

      if (!res.ok || (data as { error?: string })?.error) {
        setErrorMsg((data as { error?: string })?.error ?? 'Erreur temporaire. Merci de réessayer.');
        setResult(null);
        return;
      }

      const safe = data as GenResult;
      const alt = String(safe.alt_text || 'Image de produit sur fond clair');
      const tags = Array.isArray(safe.tags) ? safe.tags.map((t) => String(t)) : ['produit', 'photo', 'web'];

      setResult({ alt_text: alt, tags });
      bumpUse();
    } catch (e) {
      console.error(e);
      setErrorMsg('Erreur réseau. Vérifiez votre connexion puis réessayez.');
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
    el.className =
      'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
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
      ['filename', 'alt', 'tags'],
      [fileName ?? 'image', result.alt_text, result.tags.join('|')],
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName ? fileName.replace(/\.[^.]+$/, '') : 'alt-tags') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Lead (sans backend)
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
    el.className =
      'fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      {/* NAV + HERO — premium */}
      <div className="relative overflow-hidden">
        {/* Glow décoratif */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-20 -right-24 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl"></div>
          <div className="absolute top-32 -left-16 h-60 w-60 rounded-full bg-violet-300/30 blur-3xl"></div>
        </div>

        <div className="border-b border-slate-200/70 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-40">
          <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20 grid place-items-center text-white font-bold">
                T
              </div>
              <span className="font-semibold">Tagos.io</span>
            </a>
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <a href="#value" className="hover:text-indigo-600">Ce que vous gagnez</a>
              <a href="#try" className="hover:text-indigo-600">Essayer</a>
              <a href="#plans" className="hover:text-indigo-600">Offres</a>
              <a href="#partners" className="hover:text-indigo-600">Partenaires</a>
              <a href="#faq" className="hover:text-indigo-600">FAQ</a>
              <a href="#try" className="btn btn-primary shadow-md shadow-indigo-600/20">Optimiser</a>
            </div>
          </nav>
        </div>

        <header className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid gap-10 sm:grid-cols-2 items-center">
            <div>
              <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                Le référencement d’images, simplifié
              </span>
              <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
                Faites <span className="text-indigo-600">trouver</span> vos images.
              </h1>
              <p className="mt-4 text-slate-600 text-lg sm:text-xl">
                Tagos transforme chaque image en contenu compris par les moteurs&nbsp;: texte alternatif clair,
                mots-clés pertinents, nom de fichier propre, données structurées et snippet sitemap — prêts à intégrer.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a href="#try" className="btn btn-primary w-full sm:w-auto shadow-md shadow-indigo-600/20">
                  🚀 Optimiser une image
                </a>
                <a href="#value" className="btn w-full sm:w-auto">Voir tout ce que vous gagnez</a>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Aucune inscription • 3 images gratuites/jour • Fichiers non stockés
              </p>
            </div>

            {/* Carte réassurance */}
            <div className="card p-6 bg-white/80 backdrop-blur shadow-xl border border-white/60">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-slate-200 p-4 hover:shadow-lg transition">
                  <div className="text-[11px] text-slate-500">Accessibilité</div>
                  <div className="font-medium mt-1">ALT prêt à l’emploi</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 hover:shadow-lg transition">
                  <div className="text-[11px] text-slate-500">Découverte</div>
                  <div className="font-medium mt-1">Mots-clés pertinents</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 hover:shadow-lg transition">
                  <div className="text-[11px] text-slate-500">Propreté</div>
                  <div className="font-medium mt-1">Nom de fichier optimisé</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 hover:shadow-lg transition">
                  <div className="text-[11px] text-slate-500">Indexation</div>
                  <div className="font-medium mt-1">JSON-LD & sitemap</div>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* CE QUE VOUS GAGNEZ */}
      <section id="value" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-2 text-center">Tout ce qui compte pour le référencement d’une image</h2>
        <p className="text-center text-slate-600 mb-8">
          1 envoi = 6 livrables immédiats, à coller dans votre CMS.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          {[
            ['Texte alternatif (ALT)', 'Description claire et concise de l’image.'],
            ['Mots-clés', '3 à 8 mots-phrases pertinents.'],
            ['Nom de fichier', 'Propre, descriptif et sans caractères spéciaux.'],
            ['Title (info-bulle)', 'Optionnel, utile dans certains cas.'],
            ['Légende / contexte', 'Phrase courte à placer sous l’image.'],
            ['Données structurées + Sitemap', 'JSON-LD ImageObject et snippet sitemap.'],
          ].map(([t, d], i) => (
            <div key={i} className="card p-5 shadow-md hover:shadow-lg transition">
              <div className="text-base font-medium mb-1">{t}</div>
              <div className="text-slate-600">{d}</div>
            </div>
          ))}
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
            'rounded-2xl border-2 border-dashed p-8 transition shadow-sm mx-auto max-w-3xl',
            dragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 bg-white',
          ].join(' ')}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="font-medium text-slate-900">Glissez une image ici</div>
              <div className="text-xs text-slate-500 mt-1">ou</div>
              <button onClick={() => inputRef.current?.click()} className="btn mt-2" type="button">
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
                  loading="lazy"
                  decoding="async"
                  className="h-28 w-28 object-cover rounded-xl border border-slate-200 shadow"
                />
                <p className="mt-2 text-[11px] text-slate-500 text-center truncate max-w-[11rem]">{fileName}</p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500 text-center">
            JPG, PNG, WEBP — 5&nbsp;Mo max. Les fichiers ne sont pas conservés.
          </p>
        </div>

        {busy && (
          <div
            className="mt-5 card p-5 text-sm flex items-center gap-3 mx-auto max-w-3xl"
            role="status"
            aria-live="polite"
          >
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
                <span key={i} className="chip">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => copy(result.alt_text)} className="btn">Copier l’ALT</button>
              <button onClick={() => copy(result.tags.join(', '))} className="btn">Copier les mots-clés</button>
              <button onClick={downloadCSV} className="btn">Exporter en CSV</button>
              <button onClick={downloadRenamed} className="btn btn-primary shadow-md shadow-indigo-600/20">
                Télécharger l’image renommée
              </button>
            </div>

            {/* === Livrables supplémentaires === */}
            <div className="mt-6 grid gap-4">
              {/* Title */}
              <div className="card p-4">
                <div className="text-sm font-medium mb-1">Title (info-bulle)</div>
                <div className="text-sm text-slate-700">{result.alt_text}</div>
                <div className="mt-2">
                  <button onClick={() => copy(result.alt_text)} className="btn">Copier le title</button>
                </div>
              </div>

              {/* Légende */}
              <div className="card p-4">
                <div className="text-sm font-medium mb-1">Légende / contexte</div>
                <div className="text-sm text-slate-700">
                  {result.alt_text}. {result.tags.slice(0,3).join(', ')}.
                </div>
                <div className="mt-2">
                  <button onClick={() => copy(`${result.alt_text}. ${result.tags.slice(0,3).join(', ')}.`)} className="btn">
                    Copier la légende
                  </button>
                </div>
              </div>

              {/* JSON-LD */}
              <div className="card p-4">
                <div className="text-sm font-medium mb-1">Données structurées (JSON-LD)</div>
                <textarea
                  readOnly
                  className="w-full h-40 rounded-md border border-slate-300 p-2 text-xs"
                  value={JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "ImageObject",
                    "name": result.alt_text,
                    "description": result.alt_text,
                    "keywords": result.tags.join(", "),
                    "contentUrl": "https://www.exemple.com/chemin/vers/mon-image.jpg"
                  }, null, 2)}
                />
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const val = JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "ImageObject",
                        "name": result.alt_text,
                        "description": result.alt_text,
                        "keywords": result.tags.join(", "),
                        "contentUrl": "https://www.exemple.com/chemin/vers/mon-image.jpg"
                      }, null, 2);
                      copy(val);
                    }}
                    className="btn"
                  >
                    Copier JSON-LD
                  </button>
                </div>
              </div>

              {/* Sitemap Image */}
              <div className="card p-4">
                <div className="text-sm font-medium mb-1">Sitemap images (XML)</div>
                <textarea
                  readOnly
                  className="w-full h-40 rounded-md border border-slate-300 p-2 text-xs"
                  value={`<url>
  <loc>https://www.exemple.com/page-qui-contient-l-image</loc>
  <image:image>
    <image:loc>https://www.exemple.com/chemin/vers/mon-image.jpg</image:loc>
    <image:caption>${result.alt_text}</image:caption>
    <image:title>${result.alt_text}</image:title>
  </image:image>
</url>`}
                />
                <div className="mt-2">
                  <button
                    onClick={() => copy(`<url>
  <loc>https://www.exemple.com/page-qui-contient-l-image</loc>
  <image:image>
    <image:loc>https://www.exemple.com/chemin/vers/mon-image.jpg</image:loc>
    <image:caption>${result.alt_text}</image:caption>
    <image:title>${result.alt_text}</image:title>
  </image:image>
</url>`)}
                    className="btn"
                  >
                    Copier XML
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-slate-500">
              Astuce : renommez vos fichiers avec une description claire. Les CMS et Google comprennent mieux le contenu.
            </p>
          </div>
        )}
      </section>

      {/* PLANS & PARTENAIRES */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6 text-center">Des offres claires</h2>
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
            <div className="mt-4 text-3xl font-extrabold">
              7 € <span className="text-base font-normal text-slate-500">/ 300 images</span>
            </div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 300 images</li>
              <li>• Mots-clés étendus (jusqu’à 8)</li>
              <li>• Import / export CSV</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Starter%20-%20Me%20prévenir" className="btn mt-6 inline-block">
              Me prévenir
            </a>
          </div>

          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Pro</div>
            <div className="mt-1 text-slate-500 text-sm">Pour e-commerce</div>
            <div className="mt-4 text-3xl font-extrabold">
              19 € <span className="text-base font-normal text-slate-500">/ 1500 images</span>
            </div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 1 500 images</li>
              <li>• Fichiers multiples & API</li>
              <li>• Support prioritaire</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Pro%20-%20Me%20prévenir" className="btn mt-6 inline-block">
              Me prévenir
            </a>
          </div>

          <div className="card p-6 shadow-md">
            <div className="text-lg font-semibold">Agence</div>
            <div className="mt-1 text-slate-500 text-sm">Pour gros volumes</div>
            <div className="mt-4 text-3xl font-extrabold">
              49 € <span className="text-base font-normal text-slate-500">/ 5000 images</span>
            </div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• 5 000 images</li>
              <li>• API & intégrations</li>
              <li>• SLA & support dédié</li>
            </ul>
            <a href="mailto:contact@tagos.io?subject=Tagos%20Agence%20-%20Contact" className="btn mt-6 inline-block">
              Contacter
            </a>
          </div>
        </div>
      </section>

      {/* PARTENAIRES / REVENTE */}
      <section id="partners" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="card p-6 shadow-md bg-gradient-to-br from-indigo-50 to-white">
          <div className="grid sm:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-lg font-semibold">Pour créateurs de sites & agences</h3>
              <p className="text-sm text-slate-600 mt-1">
                Proposez Tagos à vos clients : normalisation des médiathèques, conformité accessibilité, indexation
                accélérée. API et intégrations à venir.
              </p>
              <a href="mailto:contact@tagos.io?subject=Programme%20Partenaires%20Tagos" className="btn mt-4">
                Rejoindre le programme
              </a>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-sm">
              <div className="font-medium mb-2">Bénéfices typiques</div>
              <ul className="space-y-1 text-slate-600">
                <li>• Médiathèques propres et cohérentes</li>
                <li>• Meilleure découvrabilité sur Google Images</li>
                <li>• Meilleure accessibilité (ALT systématiques)</li>
                <li>• Process fluide pour équipes & clients</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section id="newsletter" className="mx-auto max-w-4xl px-4 pb-14">
        <div className="card p-6 shadow-md">
          <h3 className="text-lg font-semibold">Recevoir les nouveautés & accès API</h3>
          <p className="text-sm text-slate-600 mt-1">Soyez averti dès l’ouverture des packs payants et des intégrations CMS.</p>
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
          <p className="text-[11px] text-slate-500 mt-2">En vous inscrivant, vous acceptez d’être contacté au sujet de Tagos. Désinscription possible à tout moment.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 pb-16">
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
