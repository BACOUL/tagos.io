'use client';

import React from 'react';

/* -------- Types -------- */
export type SeoResult = {
  alt: string;
  keywords: string[];
  filename: string;      // nom SEO (slug + extension)
  title: string;
  caption: string;
  structuredData: unknown; // JSON-LD ImageObject
  sitemapSnippet: string;  // XML <image:image>…
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

  /* ---------- Helpers UI ---------- */
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

  /* ---------- Téléchargements ---------- */
  async function downloadRenamed() {
    if (!originalFile) {
      toast('Aucune image à télécharger.');
      return;
    }
    const base =
      data.filename ||
      ((originalName ? originalName.replace(/\.[^.]+$/, '') : 'image') + '.jpg');

    const url = URL.createObjectURL(originalFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = base;
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

    // ⚠️ Correction du bug de parenthèses ici
    const csv = rows
      .map((r) =>
        r
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
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

  // Pack “tout-en-un” (txt)
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
        'NOTE: Téléchargez l’image renommée via “Télécharger l’image optimisée”.'
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

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Bandeau résumé rapide */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-100">
            ✅ Score lisibilité SEO
            <span className="ml-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] text-emerald-700 border border-emerald-200">
              prêt
            </span>
          </span>
          <span className="text-slate-500">
            Nom: <span className="font-medium text-slate-700">{data.filename}</span>
          </span>
          {originalName && (
            <span className="text-slate-500">
              Original: <span className="font-mono text-slate-700">{originalName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Avant / Après + actions */}
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        {/* AVANT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Avant</div>
          <div className="aspect-square rounded-xl overflow-hidden border bg-slate-50 grid place-items-center">
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
          <div className="mt-2 text-[11px] text-slate-500 truncate">{originalName || 'image'}</div>
        </div>

        {/* APRES */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Après (Tagos)</div>
          <div className="aspect-square rounded-xl overflow-hidden border bg-slate-50 grid place-items-center">
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
          <div className="mt-2 text-[11px] text-slate-500 truncate">{data.filename}</div>

          {/* Boutons principaux */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={downloadRenamed} className="btn btn-primary shadow-md shadow-indigo-600/20">
              Télécharger l’image optimisée
            </button>
            <button onClick={downloadSeoPack} className="btn">Télécharger le pack SEO</button>
            <button onClick={downloadCsv} className="btn">Export CSV</button>
          </div>
        </div>
      </div>

      {/* Détails livrables */}
      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium mb-1">Texte ALT</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{data.alt}</div>
          <div className="mt-2">
            <button onClick={() => copy(data.alt)} className="btn">Copier l’ALT</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium mb-1">Mots-clés</div>
          <div className="text-sm text-slate-700">{keywordsStr}</div>
          <div className="mt-2">
            <button onClick={() => copy(keywordsStr)} className="btn">Copier les mots-clés</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium mb-1">Titre</div>
            <div className="text-sm text-slate-700">{data.title}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.title)} className="btn">Copier le titre</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium mb-1">Légende</div>
            <div className="text-sm text-slate-700">{data.caption}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.caption)} className="btn">Copier la légende</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium mb-1">Nom de fichier SEO</div>
          <div className="text-sm text-slate-700">{data.filename}</div>
          <div className="mt-2">
            <button onClick={() => copy(data.filename)} className="btn">Copier le nom</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

      {/* Aide */}
      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={onOpenHelp || (() => {})}
          className="text-sm underline underline-offset-2 text-indigo-700 hover:text-indigo-600"
        >
          Comment intégrer dans mon CMS ?
        </button>
      </div>

      {/* Note d’aide */}
      <p className="mt-3 text-[12px] text-slate-500">
        Astuce : renommez votre fichier avec un nom descriptif clair. Les CMS et Google comprennent mieux le contenu.
      </p>
    </div>
  );
              }
