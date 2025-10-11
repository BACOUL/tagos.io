'use client';

import React, { useRef, useState, useEffect } from 'react';
import ResultCard, { type ProcessResult } from '../components/ResultCard';
import HelpPanel from '../components/HelpPanel';

/* ---------- Types pour /api/process ---------- */
type ProcessAPI = {
  ok: true;
  mime: string;
  size: number;
  originalName: string;
  remaining?: number | null;
  resetAt?: string | null;
  result: ProcessResult;
};
type ProcessError = { error: string; remaining?: number; resetAt?: string };

export default function HomePage() {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Aperçu + contexte fichier
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // Résultat (les 6 livrables)
  const [processData, setProcessData] = useState<ProcessResult | null>(null);

  // Quota UX
  const MAX_DAILY = 3;
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);

  // Menu / aide
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------- Helpers ---------- */
  function formatResetAt(iso: string | null) {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC';
    } catch {
      return null;
    }
  }
  function toast(msg: string) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.className =
      'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[70]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  /* ---------- Nettoyage URL d’aperçu ---------- */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* ---------- Révélations au scroll (fade/slide) ---------- */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove('opacity-0', 'translate-y-4');
            e.target.classList.add('opacity-100', 'translate-y-0');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => {
      el.classList.add('transition-all', 'duration-500', 'opacity-0', 'translate-y-4', 'will-change-transform');
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  /* ---------- Validation fichiers (alignée backend) ---------- */
  function isImage(file: File) {
    return /^(image\/jpeg|image\/png|image\/webp)$/.test(file.type);
  }
  function validateFile(file: File): string | null {
    if (!isImage(file)) return 'Format non supporté. Utilisez JPG, PNG ou WEBP.';
    if (file.size > 5 * 1024 * 1024) return 'Fichier trop volumineux (max 5 Mo).';
    return null;
  }

  /* ---------- Limite gratuite locale (UX) ---------- */
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

  /* ---------- Lecture initiale du quota (placeholder) ---------- */
  useEffect(() => {
    fetch('/api/quota')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.remaining === 'number') setRemaining(d.remaining);
        if (typeof d?.resetAt === 'string') setResetAt(d.resetAt);
      })
      .catch(() => {});
  }, []);

  /* ---------- Upload -> /api/process ---------- */
  async function handleFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      setProcessData(null);
      return;
    }
    if (!canUseToday(MAX_DAILY)) {
      setErrorMsg('Limite atteinte : 3 images gratuites par jour.');
      setProcessData(null);
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFileName(file.name);
    setOriginalFile(file);
    setProcessData(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/process', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.status === 429) {
        setErrorMsg((data?.error as string) || 'Quota dépassé : 3 images gratuites par jour.');
        if (typeof data?.remaining === 'number') setRemaining(data.remaining);
        if (typeof data?.resetAt === 'string') setResetAt(data.resetAt);
        setProcessData(null);
        return;
      }

      if (!res.ok || data?.error) {
        setErrorMsg((data?.error as string) || 'Erreur temporaire. Merci de réessayer.');
        setProcessData(null);
        return;
      }

      const okData = data as ProcessAPI;
      setProcessData(okData.result);
      if (typeof okData.remaining === 'number') setRemaining(okData.remaining);
      if (typeof okData.resetAt === 'string') setResetAt(okData.resetAt);
      bumpUse();
      // Ouverture auto du panneau d’aide à la 1ʳᵉ réussite
      setHelpOpen(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Erreur réseau. Vérifiez votre connexion puis réessayez.');
      setProcessData(null);
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
    toast('Merci ! Nous vous recontactons très vite.');
  }

  // Nav mobile: scroll smooth puis fermeture
  function handleMobileNavClick(targetId: string) {
    setMobileOpen(false);
    const el = document.querySelector(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      {/* ARRIÈRE-PLANS DOUX */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl"></div>
        <div className="absolute top-60 -left-12 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl"></div>
      </div>

      {/* HEADER STICKY */}
      <div className="sticky top-0 z-50 border-b border-slate-200/70 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/25 grid place-items-center text-white font-bold">
              T
            </div>
            <span className="font-semibold">Tagos.io</span>
          </a>

          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#problem" className="hover:text-indigo-600">Problèmes</a>
            <a href="#value" className="hover:text-indigo-600">Ce que vous gagnez</a>
            <a href="#try" className="hover:text-indigo-600">Essayer</a>
            <a href="#plans" className="hover:text-indigo-600">Offres</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="sm:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {!mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </nav>

        {/* Overlay mobile */}
        <div
          className={[
            'sm:hidden fixed inset-0 bg-slate-900/60 transition-opacity',
            mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          ].join(' ')}
          aria-hidden={!mobileOpen}
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer mobile */}
        <div
          id="mobile-menu"
          className={[
            'sm:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-2xl transition-transform duration-200 z-[60]',
            mobileOpen ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold">Menu</span>
            <button
              className="rounded-md p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer le menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <nav className="p-4 flex flex-col gap-3 text-sm">
            <button className="text-left hover:text-indigo-600" onClick={() => handleMobileNavClick('#problem')}>Problèmes</button>
            <button className="text-left hover:text-indigo-600" onClick={() => handleMobileNavClick('#value')}>Ce que vous gagnez</button>
            <button className="text-left hover:text-indigo-600" onClick={() => handleMobileNavClick('#try')}>Essayer</button>
            <button className="text-left hover:text-indigo-600" onClick={() => handleMobileNavClick('#plans')}>Offres</button>
            <button className="text-left hover:text-indigo-600" onClick={() => handleMobileNavClick('#faq')}>FAQ</button>
          </nav>
        </div>
      </div>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div data-reveal>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              Le référencement d’images, simplifié
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Vos images ne sont pas visibles.<br />
              <span className="text-indigo-600">Tagos les rend visibles.</span>
            </h1>
            <p className="mt-4 text-slate-600 text-lg sm:text-xl">
              Analyse, optimise et prouve le gain SEO de vos images — en un clic.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#try" className="btn btn-primary w-full sm:w-auto shadow-md shadow-indigo-600/20">
                🚀 Analyser mon image
              </a>
              <a href="#value" className="btn w-full sm:w-auto">Voir les bénéfices</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Aucune inscription • 3 images gratuites/jour • Fichiers non stockés</p>
          </div>

          <div data-reveal className="card p-6 bg-white/85 backdrop-blur shadow-xl border border-white/60">
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

      {/* PROBLÈMES ACTUELS */}
      <section id="problem" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 data-reveal className="text-2xl font-semibold mb-6 text-center">Pourquoi vos images restent invisibles</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <div data-reveal className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">ALT manquant ou vague</div>
            Sans description, les moteurs ne savent pas ce que montre l’image.
          </div>
          <div data-reveal className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Fichier “IMG_1234.jpg”</div>
            Un nom générique ne porte aucune information utile au classement.
          </div>
          <div data-reveal className="card p-5 shadow-md hover:shadow-lg transition">
            <div className="text-base font-medium mb-1">Aucun signal d’indexation</div>
            Pas de données structurées, pas d’entrée sitemap → découverte plus lente.
          </div>
        </div>
      </section>

      {/* CE QUE VOUS GAGNEZ */}
      <section id="value" className="mx-auto max-w-6xl px-4 py-12">
        <h2 data-reveal className="text-2xl font-semibold mb-2 text-center">Tout ce qui compte pour référencer une image</h2>
        <p data-reveal className="text-center text-slate-600 mb-8">1 envoi = 6 livrables immédiats à coller dans votre CMS.</p>
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          {[
            ['Texte alternatif (ALT)', 'Description claire et concise de l’image.'],
            ['Mots-clés', '3 à 8 mots-phrases pertinents.'],
            ['Nom de fichier', 'Propre, descriptif et sans caractères spéciaux.'],
            ['Title (info-bulle)', 'Optionnel, utile dans certains cas.'],
            ['Légende / contexte', 'Phrase courte à placer sous l’image.'],
            ['Données structurées + Sitemap', 'JSON-LD ImageObject et snippet sitemap.'],
          ].map(([t, d], i) => (
            <div key={i} data-reveal className="card p-5 shadow-md hover:shadow-lg transition">
              <div className="text-base font-medium mb-1">{t}</div>
              <div className="text-slate-600">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* OUTIL */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 data-reveal className="text-2xl font-semibold mb-5 text-center">Essayez maintenant</h2>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          aria-label="Zone de dépôt d’image pour générer ALT, titre, légende et sitemap"
          className={[
            'rounded-2xl border-2 border-dashed p-8 transition shadow-sm mx-auto max-w-3xl',
            dragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 bg-white',
          ].join(' ')}
          data-reveal
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="font-medium text-slate-900">Glissez une image ici</div>
              <div className="text-xs text-slate-500 mt-1">ou</div>
              <button
                onClick={() => inputRef.current?.click()}
                className="btn mt-2"
                type="button"
                disabled={busy || remaining === 0}
                title={remaining === 0 ? 'Plus de crédits aujourd’hui' : 'Choisir un fichier'}
              >
                Choisir un fichier
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              disabled={busy || remaining === 0}
              className="hidden"
            />

            {previewUrl && (
              <div className="w-full sm:w-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="aperçu"
                  loading="lazy"
                  decoding="async"
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

          {/* Bandeau crédits restants */}
          {remaining !== null && (
            <div className="mt-4 mx-auto max-w-3xl rounded-xl border bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">Crédits restants aujourd’hui</div>
                <div className="text-slate-600">
                  {MAX_DAILY - Math.max(0, remaining)} / {MAX_DAILY} utilisés
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-2 bg-indigo-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((MAX_DAILY - Math.max(0, remaining)) / MAX_DAILY) * 100
                    )}%`,
                  }}
                />
              </div>
              {resetAt && (
                <div className="mt-2 text-xs text-slate-500">Réinitialisation à {formatResetAt(resetAt)}.</div>
              )}
            </div>
          )}
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

        {/* Résultats (avant / après + téléchargements) */}
        {processData && !errorMsg && (
          <ResultCard
            data={processData}
            previewUrl={previewUrl}
            originalFile={originalFile}
            originalName={fileName}
            onOpenHelp={() => setHelpOpen(true)}
            onToast={(m) => toast(m)}
          />
        )}
      </section>

      {/* PLANS */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-14 border-t border-slate-200">
        <h2 data-reveal className="text-2xl font-semibold mb-6 text-center">Des offres claires</h2>
        <div className="grid sm:grid-cols-4 gap-6">
          <div data-reveal className="card p-6 shadow-md">
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

          <div data-reveal className="card p-6 shadow-lg border-indigo-200">
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
            <a href="mailto:contact@tagos.io?subject=Tagos%20Starter%20-%20Me%20pr%C3%A9venir" className="btn mt-6 inline-block">
              Me prévenir
            </a>
          </div>

          <div data-reveal className="card p-6 shadow-md">
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
            <a href="mailto:contact@tagos.io?subject=Tagos%20Pro%20-%20Me%20pr%C3%A9venir" className="btn mt-6 inline-block">
              Me prévenir
            </a>
          </div>

          <div data-reveal className="card p-6 shadow-md">
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

      {/* PARTENAIRES */}
      <section id="partners" className="mx-auto max-w-6xl px-4 pb-14">
        <div data-reveal className="card p-6 shadow-md bg-gradient-to-br from-indigo-50 to-white">
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
        <div data-reveal className="card p-6 shadow-md">
          <h3 className="text-lg font-semibold">Recevoir les nouveautés & accès API</h3>
          <p className="text-sm text-slate-600 mt-1">
            Soyez averti dès l’ouverture des packs payants et des intégrations CMS.
          </p>
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
          <p className="text-[11px] text-slate-500 mt-2">
            En vous inscrivant, vous acceptez d’être contacté au sujet de Tagos. Désinscription possible à tout moment.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 data-reveal className="text-2xl font-semibold mb-6 text-center">FAQ</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div data-reveal className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Stockez-vous mes images ?</div>
            Non. Les fichiers sont traités en mémoire puis supprimés immédiatement.
          </div>
          <div data-reveal className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Est-ce compatible avec mon CMS ?</div>
            Oui : WordPress, Shopify, Webflow… Copiez/collez, export CSV, ou utilisez l’image renommée.
          </div>
          <div data-reveal className="card p-5 shadow-sm">
            <div className="font-medium mb-1">Langues disponibles</div>
            Français dès maintenant. Anglais et Espagnol arrivent.
          </div>
          <div data-reveal className="card p-5 shadow-sm">
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

      {/* Help modal */}
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} defaultTab="cms" />
    </main>
  );
  }
