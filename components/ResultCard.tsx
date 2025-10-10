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

// Alias compat
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

function hasProp<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
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
  const data: SeoResult = (hasProp(props, 'data')
    ? (props.data as SeoResult)
    : (props.r as SeoResult));

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
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
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

  async function downloadSeoPack() {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const JSZip = (await import('jszip')).default as any;
      const zip = new JSZip();

      zip.file('ALT.txt', data.alt);
      zip.file('KEYWORDS.txt', keywordsStr);
      zip.file('TITLE.txt', data.title);
      zip.file('CAPTION.txt', data.caption);
      zip.file('structuredData.json', JSON.stringify(data.structuredData, null, 2));
      zip.file('sitemap-image.xml', data.sitemapSnippet);

      if (originalFile) {
        const arrayBuf = await originalFile.arrayBuffer();
        zip.file(data.filename || (originalName || 'image.jpg'), arrayBuf);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        (originalName ? originalName.replace(/\.[^.]+$/, '') : 'tagos-pack') +
        '.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      toast(
        'Pack bientôt dispo (ZIP). Copiez/collez les éléments ci-dessous pour l’instant.'
      );
    }
  }

  return (
    <div className="card p-6 shadow-lg mx-auto max-w-3xl" data-reveal>
      {/* En-tête + CTA d’aide */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">
          Résultats prêts à intégrer dans votre CMS
        </div>
        <button
          onClick={onOpenHelp || (() => {})}
          className="text-sm underline underline-offset-2 hover:text-indigo-700"
        >
          Comment utiliser ?
        </button>
      </div>

      {/* Avant / Après (live) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-2 00 p-3 bg-white">
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
          <div className="text-xs text-slate-500 mb-2">Après (Tagos)</div>
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
          onClick={downloadRenamed}
          className="btn btn-primary shadow-md shadow-indigo-600/20"
        >
          Télécharger l’image optimisée
        </button>
        <button onClick={downloadSeoPack} className="btn">
          Télécharger le pack SEO
        </button>
        <button onClick={downloadCsv} className="btn">
          Export CSV
        </button>
      </div>

      {/* Livrables détaillés */}
      <div className="mt-6 grid gap-4">
        <div>
          <div className="text-sm font-medium mb-1">Texte ALT</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">
            {data.alt}
          </div>
          <div className="mt-2">
            <button onClick={() => copy(data.alt)} className="btn">
              Copier l’ALT
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">Mots-clés</div>
          <div className="text-sm text-slate-700">{keywordsStr}</div>
          <div className="mt-2">
            <button onClick={() => copy(keywordsStr)} className="btn">
              Copier les mots-clés
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Titre</div>
            <div className="text-sm text-slate-700">{data.title}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.title)} className="btn">
                Copier le titre
              </button>
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium mb-1">Légende</div>
            <div className="text-sm text-slate-700">{data.caption}</div>
            <div className="mt-2">
              <button onClick={() => copy(data.caption)} className="btn">
                Copier la légende
              </button>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium mb-1">Nom de fichier SEO</div>
          <div className="text-sm text-slate-700">{data.filename}</div>
          <div className="mt-2">
            <button onClick={() => copy(data.filename)} className="btn">
              Copier le nom
            </button>
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
            <button onClick={() => copy(data.sitemapSnippet)} className="btn">
              Copier XML
            </button>
          </div>
        </div>
      </div>

      {/* Note d’aide */}
      <p className="mt-3 text-[12px] text-slate-500">
        Astuce : renommez votre fichier avec un nom descriptif clair. Les CMS et Google comprennent mieux le contenu.
      </p>
    </div>
  );
      }
