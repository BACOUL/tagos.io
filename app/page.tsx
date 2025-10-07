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

  // Slugify pour un nom de fichier SEO propre
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
      setErrorMsg('Limite atteinte : 3 images gratuites/jour. Passez au pack 300 pour continuer sans limite quotidienne.');
      setResult(null);
      return;
    }

    setBusy(true);
    setResult(null);
    setErrorMsg(null);
    setFileName(file.name);
    setOriginalFile(file);

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
    el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // Télécharger l’image renommée (contenu identique, nom optimisé)
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

  // Capture email (sans backend) – toast
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
    el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
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
            <a href="#value" className="hover:text-indigo-600">Ce que vous gagnez</a>
            <a href="#levers" className="hover:text-indigo-600">Tout ce qu’on optimise</a>
            <a href="#before-after" className="hover:text-indigo-600">Avant/Après</a>
            <a href="#try" className="hover:text-indigo-600">Essai</a>
            <a href="#pricing" className="hover:text-indigo-600">Tarifs</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
            <a href="#try" className="btn btn-primary shadow-md shadow-indigo-600/20">Essayer</a>
          </div>
        </nav>
      </div>

      {/* HERO — Promesse claire */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              La référence mondiale du référencement d’images
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Chaque image devient <span className="text-indigo-600">trouvable</span>.
            </h1>
            <p className="mt-4 text-slate-600 text-lg sm:text-xl">
              Tagos transforme vos visuels en contenu compris par Google : ALT clair, mots-clés pertinents,
              nom de fichier optimisé, données structurées et plus — en moins d’une minute.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#try" className="btn btn-primary w-full sm:w-auto shadow-md shadow-indigo-600/20">🚀 Optimiser une image</a>
              <a href="#value" className="btn w-full sm:w-auto">Ce que vous y gagnez</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Aucune inscription • 3 images gratuites/jour • Fichiers non stockés</p>
          </div>

          {/* Carte "Avant/Après" Hero */}
          <div className="card p-6 bg-white/80 backdrop-blur shadow-lg">
            <div className="text-sm font-medium mb-2">Avant / Après (exemple rapide)</div>
            <div className="text-sm mb-2">
              <span className="font-semibold">Nom fichier :</span>{' '}
              <span className="text-slate-700 line-through decoration-rose-400 decoration-2">IMG_1023.jpg</span>{' '}
              <span className="mx-1">→</span>
              <span className="text-slate-800 font-medium">bague-or-rose-diamant-femme.jpg</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">ALT :</span>{' '}
              <span className="text-slate-700">Bague en or rose sertie d’un diamant pour femme sur fond neutre</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['bague', 'or-rose', 'diamant', 'femme', 'bijoux'].map((t, i) => (
                <span key={i} className="chip">{t}</span>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500">Prêt à indexer, accessible et cohérent avec votre page</div>
          </div>
        </div>
      </header>

      {/* Bandeau bénéfices business */}
      <section id="value" className="bg-white/60 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-xl font-semibold text-center mb-4">Ce que vous y gagnez, concrètement</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-sm text-slate-700">
            <div className="card p-5 shadow-sm">
              <div className="font-medium mb-1">Plus de visibilité</div>
              Vos images apparaissent sur Google Images et dans les résultats enrichis produits/articles.
            </div>
            <div className="card p-5 shadow-sm">
              <div className="font-medium mb-1">Plus de clics</div>
              Des titres et descriptions clairs augmentent le taux de clic (CTR) vers vos pages.
            </div>
            <div className="card p-5 shadow-sm">
              <div className="font-medium mb-1">Plus de ventes</div>
              Chaque visuel devient une porte d’entrée vers vos fiches produit ou articles.
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Aujourd’hui, une grande partie des images du web sont mal renseignées ou muettes. Tagos corrige ça en 60 s.
          </p>
        </div>
      </section>

      {/* Les 10 leviers activés */}
      <section id="levers" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-2 text-center">Tout ce qu’on optimise, en un clic</h2>
        <p className="text-center text-slate-600 mb-8 text-sm">Tagos active l’ensemble des leviers qui comptent pour le référencement d’images.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            ['Nom de fichier', 'Des noms courts, clairs, sémantiques.'],
            ['Texte ALT', 'Des ALT compréhensibles et concis.'],
            ['Mots-clés', 'Tags sémantiques pertinents et hiérarchisés.'],
            ['Title (info-bulle)', 'Renforce la compréhension et le clic.'],
            ['Contexte recommandé', 'Légende / texte autour à insérer.'],
            ['Métadonnées (IPTC/XMP)*', 'Auteur, copyright, description.'],
            ['Données structurées', 'JSON-LD ImageObject prêt à coller.'],
            ['Sitemap images*', 'Découverte de toutes vos images.'],
            ['Compression & format*', 'Poids réduit, vitesse accrue.'],
            ['Accessibilité', 'Bonnes pratiques (WCAG) respectées.']
          ].map(([title, desc], i) => (
            <div key={i} className="card p-4 shadow-sm">
              <div className="font-medium">{title}</div>
              <div className="text-slate-600 mt-1">{desc}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">*Disponible dans les offres à venir (Pro / Expert / API).</p>
      </section>

      {/* Section Avant/Après visuelle */}
      <section id="before-after" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6 text-center">Avant / Après : le changement immédiat</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div className="card p-5 shadow-md">
            <div className="text-slate-500 text-xs mb-2">Avant</div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <div className="h-40 rounded-md bg-slate-200 grid place-items-center text-slate-500">Image</div>
              <div className="mt-3 text-xs text-slate-500">ALT manquant · Nom générique · Aucun mot-clé</div>
              <div className="mt-1 text-[11px] text-slate-400">IMG_3456.png</div>
            </div>
          </div>
          <div className="card p-5 shadow-md">
            <div className="text-slate-500 text-xs mb-2">Après Tagos</div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="h-40 rounded-md bg-slate-100 grid place-items-center text-slate-500">Image</div>
              <div className="mt-3 text-xs text-slate-600"><b>ALT :</b> Chaise design en bois clair pour salle à manger</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {['chaise','bois-clair','design','salle-a-manger','mobilier'].map((t,i)=><span key={i} className="chip">{t}</span>)}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">chaise-design-bois-clair-salle-a-manger.jpg</div>
            </div>
          </div>
        </div>
      </section>

      {/* Essai outil */}
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

      {/* Témoignages */}
      <section id="testimonials" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Ils rendent leurs images visibles avec Tagos</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          {[
            ['“On a normalisé 800 photos produits en une journée. Le gain de temps est fou.”', '— Marine, E-commerce'],
            ['“Les ALT sont propres, courts, et nos pages passent mieux en accessibilité.”', '— Karim, Agence Web'],
            ['“Enfin une méthode simple pour nommer correctement nos visuels.”', '— Léa, Média en ligne'],
          ].map(([quote, author], i) => (
            <div key={i} className="card p-5 shadow-md">
              <div className="text-slate-700">{quote}</div>
              <div className="mt-3 text-xs text-slate-500">{author}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6 text-center">3 étapes pour publier des images trouvables</h2>
        <ol className="grid sm:grid-cols-3 gap-6 text-sm">
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">1</div>Téléversez votre image.</li>
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">2</div>Récupérez ALT + mots-clés + nom optimisé.</li>
          <li className="card p-5 shadow-sm"><div className="text-2xl mb-1">3</div>Intégrez-les à votre CMS (ou téléchargez l’image renommée).</li>
        </ol>
      </section>

      {/* Tarifs */}
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

      {/* Newsletter / Leads */}
      <section id="newsletter" className="mx-auto max-w-4xl px-4 py-12">
        <div className="card p-6 shadow-md bg-gradient-to-br from-indigo-50 to-white">
          <h3 className="text-lg font-semibold">Accédez aux nouveautés & intégrations CMS</h3>
          <p className="text-sm text-slate-600 mt-1">Soyez prévenu dès l’ouverture des packs Pro/Expert, des plugins et de l’API.</p>
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
            Oui : WordPress, Shopify, Webflow, PrestaShop… Copiez/collez, export CSV, ou utilisez l’image renommée.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Qu’optimisez-vous exactement ?</div>
            ALT, nom de fichier, tags, title, contexte recommandé, données structurées… et bientôt EXIF/IPTC, sitemap et compression.
          </div>
          <div className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Y a-t-il des limites ?</div>
            5 Mo par image sur l’essai gratuit. Les packs Pro/Agence lèveront ces limites avec l’API.
          </div>
        </div>
      </section>

      {/* Footer */}
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
