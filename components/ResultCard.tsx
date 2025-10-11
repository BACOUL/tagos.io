// components/ResultCard.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

export type SeoResult = {
  alt: string;
  keywords: string[];
  filename: string;
  title: string;
  caption: string;
  structuredData: unknown;
  sitemapSnippet: string;
};

export type ProcessResult = SeoResult;

type PropsBase = {
  previewUrl?: string | null;
  originalFile?: File | null;
  originalName?: string | null;
  onOpenHelp?: () => void;
  onToast?: (msg: string) => void;
};

type Props =
  | (PropsBase & { data: SeoResult; r?: never })
  | (PropsBase & { r: SeoResult; data?: never });

function hasProp<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/* ---------------- Utils “SEO heuristics” ---------------- */

const BAD_TOKENS = ['img', 'dsc', 'pxl', 'screenshot', 'image', 'photo'];

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function extOf(name?: string | null) {
  if (!name) return '.jpg';
  const m = name.match(/(\.[a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '.jpg';
}

function isNumericish(s: string) {
  return /^[0-9]+$/.test(s);
}

function wordsFromFilename(name: string) {
  const raw = baseName(name).toLowerCase();
  const tokens = raw.split(/[-_.\s]+/).filter(Boolean);
  const cleaned = tokens.filter(t => !BAD_TOKENS.includes(t) && !/^\d{5,}$/.test(t));
  return cleaned.length ? cleaned : tokens;
}

function sentenceCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slugify(words: string[], max = 8) {
  return words.slice(0, max).join('-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-');
}

function scoreAlt(alt: string) {
  // heuristique simple: longueur + diversité + pas de digits-only
  let score = 0;
  const len = alt.trim().length;
  if (len >= 12) score += 40;
  else if (len >= 6) score += 20;
  if (!isNumericish(alt.replace(/\s/g, ''))) score += 40;
  if (/[a-z]{3,}\s+[a-z]{3,}/i.test(alt)) score += 20;
  return Math.min(100, score);
}

function scoreTitle(t: string) {
  let s = 0;
  if (t.trim().length >= 8) s += 40;
  if (/[A-Za-z]/.test(t)) s += 40;
  if (!isNumericish(t.replace(/\s/g, ''))) s += 20;
  return Math.min(100, s);
}

function scoreKeywords(arr: string[]) {
  const n = arr.filter(Boolean).length;
  if (n >= 6) return 100;
  if (n >= 3) return 70;
  if (n >= 1) return 40;
  return 10;
}

function chip(color: 'red' | 'amber' | 'green', text: string) {
  const map = {
    red: 'bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  } as const;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${map[color]}`}>{text}</span>;
}

/* ---------------- Component ---------------- */

export default function ResultCard(props: Props) {
  const {
    previewUrl = null,
    originalFile = null,
    originalName = null,
    onOpenHelp,
    onToast,
  } = props;

  // Données entrantes (prop data/r)
  const source: SeoResult = hasProp(props, 'data') ? (props.data as SeoResult) : (props.r as SeoResult);

  // Brouillon local (éditable / remplaçable par suggestions)
  const [draft, setDraft] = useState<SeoResult>(source);

  useEffect(() => {
    setDraft(source); // si les props changent
  }, [source]);

  const keywordsStr = useMemo(() => draft.keywords.join(', '), [draft.keywords]);

  function toast(msg: string) {
    if (onToast) return onToast(msg);
    const el = document.createElement('div');
    el.textContent = msg;
    el.className =
      'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast('Copié ✅');
  }

  /* ---------- Suggestions depuis le nom de fichier ---------- */

  const suggestions = useMemo(() => {
    const base = originalName ? baseName(originalName) : baseName(draft.filename || 'image');
    const words = wordsFromFilename(base);
    const human = sentenceCase(words.join(' '));
    const sugTitle = human.length ? sentenceCase(human) : 'Image optimisée';
    const sugAlt = human.length ? `Photo de ${human}` : 'Image descriptive';
    const sugKeywords = Array.from(new Set(words)).slice(0, 10);
    const slug = slugify(words, 8);
    const newFile = `${slug || 'image-optimisee'}${extOf(originalName || draft.filename)}`;
    return { sugTitle, sugAlt, sugKeywords, newFile };
  }, [originalName, draft.filename]);

  function applySuggestions() {
    setDraft(d => ({
      ...d,
      alt: d.alt && !isNumericish(d.alt) && d.alt.length > 6 ? d.alt : suggestions.sugAlt,
      title: d.title && !isNumericish(d.title) && d.title.length > 6 ? d.title : suggestions.sugTitle,
      keywords: d.keywords && d.keywords.length ? d.keywords : suggestions.sugKeywords,
      filename: suggestions.newFile,
      caption: d.caption || suggestions.sugTitle,
    }));
    toast('Suggestions appliquées ✨');
  }

  /* ---------- Téléchargements ---------- */

  async function downloadRenamedOptimized() {
    if (!originalFile) { toast('Aucune image à télécharger.'); return; }

    // compression simple via canvas
    const imageURL = URL.createObjectURL(originalFile);
    const img = new Image();
    img.src = imageURL;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });

    const MAX = 1600; // px
    const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { toast('Canvas non supporté.'); URL.revokeObjectURL(imageURL); return; }
    ctx.drawImage(img, 0, 0, w, h);

    const quality = 0.85;
    const outType = draft.filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(b => resolve(b), outType, quality));
    URL.revokeObjectURL(imageURL);

    if (!blob) { toast('Échec de la compression.'); return; }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: draft.filename || 'image-optimisee.jpg',
    });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function downloadCsv() {
    const rows = [
      ['original_name', 'filename', 'alt', 'keywords', 'title', 'caption'],
      [originalName ?? 'image', draft.filename, draft.alt, draft.keywords.join(', '), draft.title, draft.caption],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: (originalName ? baseName(originalName) : 'tagos-export') + '.csv',
    });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadSeoPack() {
    const packParts: string[] = [];
    packParts.push('=== TAGOS — PACK SEO ===\n');
    packParts.push('>> FICHIER IMAGE (NOM SEO)'); packParts.push(draft.filename + '\n');
    packParts.push('>> ALT'); packParts.push(draft.alt + '\n');
    packParts.push('>> TITLE'); packParts.push(draft.title + '\n');
    packParts.push('>> LEGENDE'); packParts.push(draft.caption + '\n');
    packParts.push('>> KEYWORDS (séparés par des virgules)'); packParts.push(draft.keywords.join(', ') + '\n');
    packParts.push('>> JSON-LD (structuredData.json)'); packParts.push(JSON.stringify(draft.structuredData, null, 2) + '\n');
    packParts.push('>> SITEMAP IMAGE (sitemap-image.xml)'); packParts.push(draft.sitemapSnippet + '\n');

    const content = packParts.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${baseName(originalName || draft.filename || 'tagos-pack')}.tagos-pack.txt`,
    });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------- Scores & warnings ---------- */

  const sAlt = scoreAlt(draft.alt || '');
  const sTitle = scoreTitle(draft.title || '');
  const sKw = scoreKeywords(draft.keywords || []);

  const chipAlt = sAlt >= 80 ? chip('green', 'ALT bon') : sAlt >= 50 ? chip('amber', 'ALT moyen') : chip('red', 'ALT faible');
  const chipTitle = sTitle >= 80 ? chip('green', 'Titre bon') : sTitle >= 50 ? chip('amber', 'Titre moyen') : chip('red', 'Titre faible');
  const chipKw = sKw >= 80 ? chip('green', 'Mots-clés ok') : sKw >= 50 ? chip('amber', 'Mots-clés légers') : chip('red', 'Mots-clés manquent');

  return (
    <div className="card p-6 shadow-lg mx-auto max-w-3xl" data-reveal>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">Résultats prêts à intégrer</div>
        <button onClick={onOpenHelp || (() => {})} className="text-sm underline underline-offset-2 hover:text-indigo-700">
          Comment utiliser ?
        </button>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {chipAlt} {chipTitle} {chipKw}
      </div>

      {/* Avant / Après */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3 bg-white">
          <div className="text-xs text-slate-500 mb-2">Avant</div>
          <div className="aspect-square rounded-lg overflow-hidden border bg-slate-50 grid place-items-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="aperçu avant" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="text-xs text-slate-400">Aperçu indisponible</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">{originalName || 'image'}</div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 bg-white">
          <div className="text-xs text-slate-500 mb-2">Après (Tagos)</div>
          <div className="aspect-square rounded-lg overflow-hidden border bg-slate-50 grid place-items-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={draft.alt || 'image optimisée'} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="text-xs text-slate-400">Aperçu indisponible</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">{draft.filename}</div>
        </div>
      </div>

      {/* Actions principales */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={downloadRenamedOptimized} className="btn btn-primary shadow-md shadow-indigo-600/20">
          Télécharger l’image optimisée
        </button>
        <button onClick={downloadSeoPack} className="btn">Télécharger le pack SEO</button>
        <button onClick={downloadCsv} className="btn">Export CSV</button>
        <button onClick={applySuggestions} className="btn">Appliquer les suggestions</button>
      </div>

      {/* Livrables (brouillon) */}
      <div className="mt-6 grid gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium">Texte ALT</div>
            {chipAlt}
          </div>
          <textarea
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            rows={2}
            value={draft.alt}
            onChange={(e) => setDraft(d => ({ ...d, alt: e.target.value }))}
          />
          <div className="mt-2 flex gap-2">
            <button onClick={() => copy(draft.alt)} className="btn">Copier l’ALT</button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium">Mots-clés</div>
            {chipKw}
          </div>
          <input
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={keywordsStr}
            onChange={(e) =>
              setDraft(d => ({ ...d, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))
            }
          />
          <div className="mt-2">
            <button onClick={() => copy(draft.keywords.join(', '))} className="btn">Copier les mots-clés</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium">Titre</div>
              {chipTitle}
            </div>
            <input
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              value={draft.title}
              onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
            />
            <div className="mt-2">
              <button onClick={() => copy(draft.title)} className="btn">Copier le titre</button>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Légende</div>
            <textarea
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              rows={2}
              value={draft.caption}
              onChange={(e) => setDraft(d => ({ ...d, caption: e.target.value }))}
            />
            <div className="mt-2">
              <button onClick={() => copy(draft.caption)} className="btn">Copier la légende</button>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium mb-1">Nom de fichier SEO</div>
          <input
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={draft.filename}
            onChange={(e) => setDraft(d => ({ ...d, filename: e.target.value }))}
          />
          <div className="mt-2">
            <button onClick={() => copy(draft.filename)} className="btn">Copier le nom</button>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium mb-1">Données structurées (JSON-LD)</div>
          <textarea
            readOnly
            className="w-full h-40 rounded-md border border-slate-300 p-2 text-xs"
            value={JSON.stringify(draft.structuredData, null, 2)}
          />
          <div className="mt-2">
            <button onClick={() => copy(JSON.stringify(draft.structuredData, null, 2))} className="btn">
              Copier JSON-LD
            </button>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium mb-1">Sitemap images (XML)</div>
          <textarea
            readOnly
            className="w-full h-40 rounded-md border border-slate-300 p-2 text-xs"
            value={draft.sitemapSnippet}
          />
          <div className="mt-2">
            <button onClick={() => copy(draft.sitemapSnippet)} className="btn">Copier XML</button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-slate-500">
        Astuce : si le nom d’origine est un identifiant (ex. “IMG_0001”), utilisez “Appliquer les suggestions” pour générer un vrai nom SEO.
      </p>
    </div>
  );
}
