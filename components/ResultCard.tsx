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
  onOpenHelp?: () => void;
  onToast?: (msg: string) => void;
};

type Props =
  | (PropsBase & { data: SeoResult; r?: never })
  | (PropsBase & { r: SeoResult; data?: never });

function hasProp<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/* --------- Scoring très lisible (0 → 100) ---------
   Règles simples et compréhensibles:
   - ALT 50–140 caractères: +25 (sinon prorata)
   - Mots-clés 3–8: +25 (sinon prorata)
   - Filename non générique (≠ IMG_/DSC_...): +15
   - Title présent: +10
   - Légende présente: +10
   - JSON-LD présent: +10
   - Sitemap snippet présent: +5
*/
function computeScore(d: SeoResult): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;

  // ALT
  const altLen = (d.alt || '').trim().length;
  if (altLen >= 50 && altLen <= 140) {
    s += 25;
    reasons.push('ALT: longueur idéale (50–140)');
  } else {
    // prorata simple
    const ratio = Math.min(1, altLen / 140);
    const pts = Math.round(25 * ratio);
    s += pts;
    reasons.push(`ALT: ${altLen} caractères (${pts}/25)`);
  }

  // Keywords
  const kw = Array.isArray(d.keywords) ? d.keywords.filter(Boolean) : [];
  if (kw.length >= 3 && kw.length <= 8) {
    s += 25;
    reasons.push('Mots-clés: quantité idéale (3–8)');
  } else {
    const ratio = Math.min(1, kw.length / 8);
    const pts = Math.round(25 * ratio);
    s += pts;
    reasons.push(`Mots-clés: ${kw.length} (${pts}/25)`);
  }

  // Filename non générique
  const fn = (d.filename || '').toLowerCase();
  const generic = /^(img_|dsc_|image|photo|p[0-9]+|img[0-9]+)/.test(fn);
  if (!generic && fn) {
    s += 15;
    reasons.push('Nom de fichier: descriptif');
  } else {
    reasons.push('Nom de fichier: générique');
  }

  if (d.title?.trim()) { s += 10; reasons.push('Title: présent'); }
  else { reasons.push('Title: manquant'); }

  if (d.caption?.trim()) { s += 10; reasons.push('Légende: présente'); }
  else { reasons.push('Légende: manquante'); }

  if (d.structuredData) { s += 10; reasons.push('JSON-LD: présent'); }
  else { reasons.push('JSON-LD: manquant'); }

  if (d.sitemapSnippet?.trim()) { s += 5; reasons.push('Sitemap: présent'); }
  else { reasons.push('Sitemap: manquant'); }

  return { score: Math.max(0, Math.min(100, s)), reasons };
}

/* --------- Dessin du badge de note sur l'image --------- */
async function drawScoreOnImage(imgUrl: string, score: number): Promise<Blob> {
  // charge l'image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = imgUrl;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('Impossible de charger l’aperçu.'));
  });

  // canvas
  const canvas = document.createElement('canvas');
  const scale = 1; // garder la taille originale
  canvas.width = Math.max(1, Math.floor(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // badge
  const pad = Math.round(Math.max(canvas.width, canvas.height) * 0.02); // 2%
  const radius = Math.round(Math.max(canvas.width, canvas.height) * 0.055); // rayon badge
  const cx = pad + radius;
  const cy = pad + radius;

  // cercle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  // fond en fonction du score
  let bg = '#f97316'; // orange
  if (score >= 80) bg = '#10b981'; // vert
  else if (score >= 60) bg = '#f59e0b'; // amber
  ctx.fillStyle = bg;
  ctx.fill();

  // texte
  const pct = `${score}`;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(radius * 0.9)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pct, cx, cy);

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92);
  });
}

export default function ResultCard(props: Props) {
  const {
    previewUrl = null,
    originalFile = null,
    originalName = null,
    onOpenHelp,
    onToast,
  } = props;

  // Garde robuste: assure qu'on a data OU r
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
      ['original_name', 'filename', 'alt', 'keywords', 'title', 'caption'],
      [
        originalName ?? 'image',
        data.filename,
        data.alt,
        keywordsStr,
        data.title,
        data.caption,
      ],
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')))
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

  // Version sans dépendance: crée un fichier texte contenant tous les livrables
  async function downloadSeoPack() {
    const packParts: string[] = [];

    packParts.push('=== TAGOS — PACK SEO ===\n');

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
      packParts.push(
        'NOTE: Téléchargez l’image renommée via le bouton “Télécharger l’image optimisée”.'
      );
    } else {
      packParts.push(
        'NOTE: Aucune image source attachée. Renommez votre fichier local avec le nom SEO ci-dessus.'
      );
    }

    const content = packParts.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = originalName ? originalName.replace(/\.[^.]+$/, '') : 'tagos-pack';
    a.href = url;
    a.download = `${base}.tagos-pack.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // Télécharger l'image avec badge de score
  async function downloadScoredImage() {
    try {
      if (!previewUrl) {
        toast('Aperçu indisponible.');
        return;
      }
      const { score } = computeScore(data);
      const blob = await drawScoreOnImage(previewUrl, score);
      const a = document.createElement('a');
      const base = data.filename?.replace(/\.[^.]+$/, '') || originalName?.replace(/\.[^.]+$/, '') || 'image';
      a.href = URL.createObjectURL(blob);
      a.download = `${base}-note-${score}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch {
      toast('Impossible de générer l’image notée.');
    }
  }

  const { score, reasons } = computeScore(data);

  return (
    <div className="card p-5 sm:p-6 shadow-lg mx-auto max-w-3xl" data-reveal>
      {/* En-tête compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="text-sm text-slate-500">Résultats prêts à intégrer dans votre CMS</div>
        <button
          onClick={onOpenHelp || (() => {})}
          className="text-sm underline underline-offset-2 hover:text-indigo-700 self-start sm:self-auto"
        >
          Comment utiliser ?
        </button>
      </div>

      {/* Bloc visuel: image + score + actions principales */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-4">
        {/* Image avec légende fichier */}
        <div className="rounded-xl border border-slate-200 p-3 bg-white">
          <div className="aspect-[4/3] rounded-lg overflow-hidden border bg-slate-50 grid place-items-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={data.alt || 'aperçu'}
                className="h-full w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="text-xs text-slate-400">Aperçu indisponible</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            {data.filename || originalName || 'image'}
          </div>
        </div>

        {/* Score + actions */}
        <div className="rounded-xl border border-slate-200 p-3 bg-white flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={[
                  'h-14 w-14 rounded-full grid place-items-center text-white text-lg font-bold',
                  score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-orange-500',
                ].join(' ')}
                aria-label={`Note de référencement ${score}/100`}
                title={`Note ${score}/100`}
              >
                {score}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-900">Note de référencement</div>
              <div className="text-slate-600">Calcule basée sur ALT, mots-clés, nom, title, légende, JSON-LD, sitemap.</div>
            </div>
          </div>

          <div className="grid gap-2">
            <button
              onClick={downloadScoredImage}
              className="btn btn-primary shadow-md shadow-indigo-600/20 w-full"
            >
              Télécharger l’image notée
            </button>
            <button onClick={downloadRenamed} className="btn w-full">
              Télécharger l’image optimisée (nom SEO)
            </button>
            <button onClick={downloadSeoPack} className="btn w-full">
              Télécharger le pack SEO (TXT)
            </button>
            <button onClick={downloadCsv} className="btn w-full">
              Export CSV
            </button>
          </div>

          <ul className="mt-1 text-[12px] text-slate-600 list-disc pl-5 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Livrables détaillés (compact, lisible) */}
      <div className="mt-6 grid gap-4">
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
            <div className="text-sm text-slate-700 break-words">{data.title}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.title)} className="btn">Copier le titre</button>
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Légende</div>
            <div className="text-sm text-slate-700 break-words">{data.caption}</div>
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

      {/* Note UX */}
      <p className="mt-3 text-[12px] text-slate-500">
        Astuce : renommez votre fichier avec un nom descriptif clair. Les CMS et Google comprennent mieux le contenu.
      </p>
    </div>
  );
  }
