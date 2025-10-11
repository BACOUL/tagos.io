'use client';

import React, { useMemo, useRef, useState } from 'react';

/* -------- Types simples -------- */
export type SeoResult = {
  alt: string;
  keywords: string[];
  filename: string;      // nom SEO (slug + extension)
  title: string;
  caption: string;
  structuredData: unknown;
  sitemapSnippet: string;
};
export type ProcessResult = SeoResult;

/* ---- Props ---- */
type PropsBase = {
  previewUrl?: string | null;
  originalFile?: File | null;
  originalName?: string | null;
  onToast?: (msg: string) => void;
};
type Props =
  | (PropsBase & { data: SeoResult; r?: never })
  | (PropsBase & { r: SeoResult; data?: never });

/* ---- Utils ---- */
function hasProp<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}
function toastFallback(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.className =
    'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow z-[60]';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/** Score très simple côté client (placeholder) */
function computeScore(r: SeoResult): number {
  let s = 40;
  if (r.alt && r.alt.trim().length > 8) s += 15;
  if (r.title && r.title.trim().length > 3) s += 10;
  if (r.caption && r.caption.trim().length > 8) s += 10;
  const k = r.keywords.filter(Boolean).length;
  if (k >= 3 && k <= 10) s += 15;
  if (r.filename && !/^(IMG_|DSC_|PXL_)/i.test(r.filename)) s += 10;
  return Math.max(0, Math.min(100, s));
}

/** Dessine l’overlay “note” sur l’image */
async function stampImageWithScore(srcUrl: string, score: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = srcUrl;
  });

  const canvas = document.createElement('canvas');
  const maxSide = 2000; // garde des fichiers raisonnables
  const ratio = img.width / img.height;
  if (img.width > img.height) {
    canvas.width = Math.min(img.width, maxSide);
    canvas.height = Math.round(canvas.width / ratio);
  } else {
    canvas.height = Math.min(img.height, maxSide);
    canvas.width = Math.round(canvas.height * ratio);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Badge blanc semi-opaque en bas à droite
  const pad = Math.round(canvas.width * 0.02);
  const badgeW = Math.round(canvas.width * 0.34);
  const badgeH = Math.round(canvas.height * 0.12);
  const x = canvas.width - badgeW - pad;
  const y = canvas.height - badgeH - pad;
  const r = Math.round(badgeH * 0.22);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + badgeW - r, y);
  ctx.quadraticCurveTo(x + badgeW, y, x + badgeW, y + r);
  ctx.lineTo(x + badgeW, y + badgeH - r);
  ctx.quadraticCurveTo(x + badgeW, y + badgeH, x + badgeW - r, y + badgeH);
  ctx.lineTo(x + r, y + badgeH);
  ctx.quadraticCurveTo(x, y + badgeH, x, y + badgeH - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();

  // Texte
  const title = 'Tagos – Score';
  const scoreTxt = `${score}/100`;
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.textBaseline = 'middle';

  // Ligne 1
  ctx.font = `${Math.round(badgeH * 0.22)}px Inter, system-ui, sans-serif`;
  ctx.fillText(title, x + pad, y + badgeH * 0.35);

  // Ligne 2 (score gras)
  ctx.font = `600 ${Math.round(badgeH * 0.38)}px Inter, system-ui, sans-serif`;
  ctx.fillText(scoreTxt, x + pad, y + badgeH * 0.76);

  return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
}

export default function ResultCard(props: Props) {
  const { previewUrl = null, originalFile = null, originalName = null, onToast } = props;

  if (!hasProp(props, 'data') && !hasProp(props, 'r')) {
    throw new Error('ResultCard: prop manquante — fournissez `data` ou `r`.');
  }
  const data: SeoResult = hasProp(props, 'data')
    ? (props.data as SeoResult)
    : (props.r as SeoResult);

  const toast = onToast ?? toastFallback;
  const score = useMemo(() => computeScore(data), [data]);
  const [downloading, setDownloading] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  async function downloadStamped() {
    if (!previewUrl) {
      toast('Aucun aperçu disponible.');
      return;
    }
    try {
      setDownloading(true);
      const blob = await stampImageWithScore(previewUrl, score);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const base = (data.filename || originalName || 'image').replace(/\.[^.]+$/, '');
      a.download = `${base}--score-${score}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch {
      toast('Impossible de marquer l’image.');
    } finally {
      setDownloading(false);
    }
  }

  async function downloadPack() {
    const parts: string[] = [];
    parts.push('=== TAGOS — PACK SEO ===\n');
    parts.push(`>> SCORE\n${score}/100\n`);
    parts.push('>> FICHIER IMAGE (NOM SEO)\n' + data.filename + '\n');
    parts.push('>> ALT\n' + data.alt + '\n');
    parts.push('>> TITLE\n' + data.title + '\n');
    parts.push('>> LEGENDE\n' + data.caption + '\n');
    parts.push('>> KEYWORDS\n' + data.keywords.join(', ') + '\n');
    parts.push('>> JSON-LD (structuredData.json)\n' + JSON.stringify(data.structuredData, null, 2) + '\n');
    parts.push('>> SITEMAP IMAGE (sitemap-image.xml)\n' + data.sitemapSnippet + '\n');

    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    const base = (originalName || data.filename || 'tagos-pack').replace(/\.[^.]+$/, '');
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.tagos-pack.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Bandeau note */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Score Tagos&nbsp;<strong className="text-emerald-800">{score}/100</strong>
          </span>
          <span className="hidden sm:inline text-slate-500 text-sm">
            {data.filename || originalName}
          </span>
        </div>
        <div className="text-xs text-slate-400">prévisualisation ci-dessous</div>
      </div>

      {/* Aperçu responsive */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50 grid place-items-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={previewUrl}
              alt={data.alt || 'aperçu'}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="text-xs text-slate-400">Aperçu indisponible</div>
          )}
        </div>

        {/* CTA principaux */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={downloadStamped}
            disabled={downloading}
            className="btn btn-primary shadow-md shadow-indigo-600/20 w-full sm:w-auto"
          >
            {downloading ? 'Génération…' : 'Télécharger l’image avec la note'}
          </button>
          <button onClick={downloadPack} className="btn w-full sm:w-auto">
            Télécharger le pack (score + SEO)
          </button>
        </div>
      </div>

      {/* Détails repliables */}
      <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm text-slate-700">Voir les détails SEO</summary>
        <div className="mt-3 grid gap-3 text-sm text-slate-700">
          <div><span className="font-medium">ALT :</span> {data.alt || '—'}</div>
          <div><span className="font-medium">Mots-clés :</span> {data.keywords.join(', ') || '—'}</div>
          <div><span className="font-medium">Titre :</span> {data.title || '—'}</div>
          <div><span className="font-medium">Légende :</span> {data.caption || '—'}</div>
          <div><span className="font-medium">Nom de fichier :</span> {data.filename || '—'}</div>
        </div>
      </details>
    </div>
  );
    }
