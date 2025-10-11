'use client';

import React from 'react';

/* -------- Types -------- */
export type SeoResult = {
  alt: string;
  keywords: string[];
  filename: string;     // nom SEO (slug + extension)
  title: string;
  caption: string;
  structuredData: any;  // JSON-LD ImageObject
  sitemapSnippet: string;
};

// Alias compat (si d'autres fichiers importent ProcessResult)
export type ProcessResult = SeoResult;

/* ---- Props ----
   On accepte AU CHOIX:
   - { data: SeoResult }    (nouveau)
   - { r: SeoResult }       (ancien usage)
*/
type PropsBase = {
  previewUrl?: string | null;
  originalFile?: File | null;
  originalName?: string | null;
  onToast?: (msg: string) => void;
};

type Props =
  | (PropsBase & { data: SeoResult; r?: never })
  | (PropsBase & { r: SeoResult; data?: never });

function hasProp<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/* ===================== Scoring helpers crédibles (3 indices) ===================== */

function clamp(x: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(x)));
}

function normLenScore(len: number, idealMin: number, idealMax: number, fullPoints = 100) {
  // score maximum si dans l'intervalle idéal,
  // décroissance linéaire en dehors, jusqu'à 0.
  if (len <= 0) return 0;
  if (len >= idealMin && len <= idealMax) return fullPoints;
  const dist =
    len < idealMin ? idealMin - len : len - idealMax;
  const range = Math.max(idealMax - idealMin, 1);
  const penalty = Math.min(1, dist / range); // 0..1
  return clamp(fullPoints * (1 - penalty));
}

function tokenize(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = new Set([...A].filter(x => B.has(x))).size;
  const uni = new Set([...A, ...B]).size || 1;
  return inter / uni; // 0..1
}

/** Qualité du nom de fichier (0..100) */
function scoreFilename(name: string | null | undefined): number {
  if (!name) return 0;
  const base = name.replace(/\.[^.]+$/, '');
  if (!base) return 0;

  const onlyDigits = /^\d+$/.test(base);
  const generic = /(IMG|DSC|PXL|PHOTO|image|IMG_\d+)/i.test(base);
  const hasSeparators = /[-_]/.test(base);
  const hasLetters = /[a-zA-Z]/.test(base);
  const tooLong = base.length > 60;
  const tooShort = base.length < 6;
  const words = base.split(/[-_]+/).filter(Boolean);
  const wordCount = words.length;

  let s = 0;
  if (hasLetters) s += 25;
  if (hasSeparators) s += 15;
  if (!onlyDigits) s += 15;
  if (!generic) s += 15;
  if (wordCount >= 2 && wordCount <= 8) s += 20;
  if (!tooLong && !tooShort) s += 10;

  return clamp(s);
}

/** Lisibilité (ALT + Title + Caption) -> 0..100 */
function scoreReadability(alt: string, title: string, caption: string): number {
  let s = 0;

  // ALT: longueur et présence
  if (alt?.trim()) {
    const len = alt.trim().length;
    s += 40 * (normLenScore(len, 50, 120) / 100); // 0..40
  }

  // Title: bonus présence + longueur raisonnable
  if (title?.trim()) {
    const len = title.trim().length;
    s += 20 * (normLenScore(len, 20, 70) / 100); // 0..20
  }

  // Caption: bonus présence + longueur raisonnable
  if (caption?.trim()) {
    const len = caption.trim().length;
    s += 20 * (normLenScore(len, 30, 140) / 100); // 0..20
  }

  // Pénalité si ALT, title ou caption ne contiennent que des chiffres
  const allNumeric = (t: string) => /^\d+$/.test((t || '').trim());
  if (allNumeric(alt)) s -= 15;
  if (allNumeric(title)) s -= 10;
  if (allNumeric(caption)) s -= 10;

  return clamp(s);
}

/** Indexabilité (filename + JSON-LD + Sitemap) -> 0..100 */
function scoreIndexability(filename: string, hasJsonLd: boolean, hasSitemap: boolean): number {
  let s = 0;

  s += 60 * (scoreFilename(filename) / 100); // 0..60

  if (hasJsonLd) s += 20;
  if (hasSitemap) s += 20;

  return clamp(s);
}

/** Pertinence (keywords qualité + cohérence avec ALT) -> 0..100 */
function scoreRelevance(keywords: string[], alt: string): number {
  const cleanKw = (keywords || []).map(k => String(k || '').trim()).filter(Boolean);
  let s = 0;

  // Taille du set, diversité, pas trop ni pas assez
  const uniq = Array.from(new Set(cleanKw.map(k => k.toLowerCase())));
  const count = uniq.length;
  if (count >= 3 && count <= 8) s += 35;
  else if (count > 0) s += 15;

  // Pénalité si beaucoup de doublons ou si tous identiques/numériques
  if (count <= 1 && cleanKw.length > 1) s -= 10;
  if (uniq.every(k => /^\d+$/.test(k))) s -= 20;

  // Longueur moyenne des mots/phrases (viser descriptif court)
  const avgLen =
    uniq.reduce((acc, k) => acc + k.length, 0) / Math.max(1, count);
  s += 25 * (normLenScore(avgLen, 6, 26) / 100);

  // Cohérence avec l’ALT (Jaccard)
  const tA = tokenize(alt);
  const tK = tokenize(uniq.join(' '));
  const jac = jaccard(tA, tK); // 0..1
  s += Math.round(40 * jac); // 0..40

  return clamp(s);
}

/** Score global pondéré */
function scoreGlobal(readability: number, indexability: number, relevance: number) {
  // 35% + 35% + 30%
  const g = 0.35 * readability + 0.35 * indexability + 0.30 * relevance;
  return clamp(g);
}

/* ===================== Composant ===================== */

export default function ResultCard(props: Props) {
  const {
    previewUrl = null,
    originalFile = null,
    originalName = null,
    onToast,
  } = props;

  if (!hasProp(props, 'data') && !hasProp(props, 'r')) {
    throw new Error('ResultCard: prop manquante — fournissez `data` ou `r`.');
  }
  const data: SeoResult = hasProp(props, 'data')
    ? (props.data as SeoResult)
    : (props.r as SeoResult);

  const keywordsStr = data.keywords.join(', ');

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

  /* ---- Scores ---- */
  const readability = scoreReadability(data.alt, data.title, data.caption);
  const indexability = scoreIndexability(data.filename, !!data.structuredData, !!data.sitemapSnippet);
  const relevance = scoreRelevance(data.keywords, data.alt);
  const globalScore = scoreGlobal(readability, indexability, relevance);

  /* ---- Actions ---- */

  async function downloadRenamed() {
    if (!originalFile) {
      toast('Aucune image à télécharger.');
      return;
    }
    const newName =
      data.filename ||
      (originalName ? originalName.replace(/\.[^.]+$/, '') : 'image') + '.jpg';

    const url = URL.createObjectURL(originalFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = newName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function downloadCsv() {
    const rows = [
      ['original_name', 'filename', 'alt', 'keywords', 'title', 'caption', 'readability', 'indexability', 'relevance', 'global'],
      [
        originalName ?? 'image',
        data.filename,
        data.alt,
        keywordsStr,
        data.title,
        data.caption,
        String(readability),
        String(indexability),
        String(relevance),
        String(globalScore),
      ],
    ];
    const csv = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      (originalName ? originalName.replace(/\.[^.]+$/, '') : 'tagos-export') +
      '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Image annotée avec la note globale
  async function downloadImageWithScore() {
    if (!originalFile || !previewUrl) {
      toast('Aperçu indisponible.');
      return;
    }
    const img = new Image();
    img.src = previewUrl;
    await img.decode();

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast('Canvas non supporté.');
      return;
    }

    ctx.drawImage(img, 0, 0, w, h);

    // Badge
    const pad = Math.max(16, Math.round(w * 0.02));
    const radius = Math.max(12, Math.round(w * 0.015));
    const badgeH = Math.max(60, Math.round(h * 0.09));
    const badgeW = Math.max(300, Math.round(w * 0.32));

    // Fond blanc semi opaque
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(ctx, pad, pad, badgeW, badgeH, radius);
    ctx.fill();

    // Texte
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${Math.max(22, Math.round(badgeH * 0.35))}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.fillText(`Score ${globalScore}/100`, pad + Math.round(badgeH * 0.4), pad + Math.round(badgeH * 0.65));

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) {
      toast('Export impossible.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = (data.filename || originalName || 'image').replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = `${base}-score.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // Pack texte contenant tous les livrables + sous-scores
  async function downloadSeoPack() {
    const packParts: string[] = [];

    packParts.push('=== PACK SEO IMAGE ===\n');

    packParts.push('>> SCORES');
    packParts.push(`Lisibilité : ${readability}/100`);
    packParts.push(`Indexabilité : ${indexability}/100`);
    packParts.push(`Pertinence : ${relevance}/100`);
    packParts.push(`Global : ${globalScore}/100\n`);

    packParts.push('>> FICHIER IMAGE (NOM SEO)');
    packParts.push(data.filename + '\n');

    packParts.push('>> ALT');
    packParts.push(data.alt + '\n');

    packParts.push('>> TITLE');
    packParts.push(data.title + '\n');

    packParts.push('>> LEGENDE');
    packParts.push(data.caption + '\n');

    packParts.push('>> KEYWORDS (séparés par des virgules)');
    packParts.push(keywordsStr + '\n');

    packParts.push('>> JSON-LD (structuredData.json)');
    packParts.push(JSON.stringify(data.structuredData, null, 2) + '\n');

    packParts.push('>> SITEMAP IMAGE (sitemap-image.xml)');
    packParts.push(data.sitemapSnippet + '\n');

    if (originalFile) {
      packParts.push('NOTE: Téléchargez aussi l’image annotée (voir bouton dédié).');
    } else {
      packParts.push('NOTE: Aucune image source attachée.');
    }

    const content = packParts.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = originalName ? originalName.replace(/\.[^.]+$/, '') : 'tagos-pack';
    a.href = url;
    a.download = `${base}.pack.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ===================== UI ===================== */

  return (
    <div className="card p-6 shadow-lg mx-auto max-w-3xl" data-reveal>
      {/* Scores détaillés */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <strong>Global</strong> {globalScore}/100
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-sm">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <strong>Lisibilité</strong> {readability}/100
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 text-sm">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
          <strong>Indexabilité</strong> {indexability}/100
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-sm">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          <strong>Pertinence</strong> {relevance}/100
        </span>
      </div>

      {/* Avant / Après */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-3 bg-white">
          <div className="text-xs text-slate-500 mb-2">Avant</div>
          <div className="aspect-square rounded-lg overflow-hidden border bg-slate-50 grid place-items-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="aperçu avant"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="text-xs text-slate-400">Aperçu indisponible</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            {originalName || 'image'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 bg-white">
          <div className="text-xs text-slate-500 mb-2">Après (optimisé)</div>
          <div className="aspect-square rounded-lg overflow-hidden border bg-slate-50 grid place-items-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={data.alt || 'image optimisée'}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="text-xs text-slate-400">Aperçu indisponible</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            {data.filename}
          </div>
        </div>
      </div>

      {/* Boutons principaux */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={downloadImageWithScore}
          className="btn btn-primary shadow-md shadow-indigo-600/20"
        >
          Télécharger l’image avec la note
        </button>
        <button onClick={downloadSeoPack} className="btn">
          Télécharger le pack (scores + SEO)
        </button>
        <button onClick={downloadCsv} className="btn">
          Export CSV
        </button>
        <button onClick={downloadRenamed} className="btn">
          Télécharger l’image renommée
        </button>
      </div>

      {/* Livrables détaillés */}
      <details className="mt-6">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-800">
          Voir les détails SEO
        </summary>
        <div className="mt-4 grid gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Texte ALT</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{data.alt}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.alt)} className="btn">Copier l’ALT</button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Mots-clés</div>
            <div className="text-sm text-slate-700">{keywordsStr}</div>
            <div className="mt-2">
              <button onClick={() => copy(keywordsStr)} className="btn">Copier les mots-clés</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Titre</div>
              <div className="text-sm text-slate-700">{data.title}</div>
              <div className="mt-2">
                <button onClick={() => copy(data.title)} className="btn">Copier le titre</button>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm font-medium mb-1">Légende</div>
              <div className="text-sm text-slate-700">{data.caption}</div>
              <div className="mt-2">
                <button onClick={() => copy(data.caption)} className="btn">Copier la légende</button>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Nom de fichier SEO</div>
            <div className="text-sm text-slate-700">{data.filename}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.filename)} className="btn">Copier le nom</button>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Données structurées (JSON-LD)</div>
            <textarea
              readOnly
              className="w-full h-40 rounded-md border border-slate-300 p-2 text-xs"
              value={JSON.stringify(data.structuredData, null, 2)}
            />
            <div className="mt-2">
              <button
                onClick={() => copy(JSON.stringify(data.structuredData, null, 2))}
                className="btn"
              >
                Copier JSON-LD
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Sitemap images (XML)</div>
            <textarea
              readOnly
              className="w-full h-40 rounded-md border border-slate-300 p-2 text-xs"
              value={data.sitemapSnippet}
            />
            <div className="mt-2">
              <button onClick={() => copy(data.sitemapSnippet)} className="btn">Copier XML</button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
