// components/HelpPanel.tsx
'use client';

import React from 'react';

/* -------- Types -------- */
export type SeoResult = {
  alt: string;
  keywords: string[];
  filename: string;     // nom SEO (slug + extension)
  title: string;
  caption: string;
  structuredData: unknown;  // JSON-LD ImageObject
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

export default function HelpPanel(props: Props) {
  const {
    previewUrl = null,
    originalFile = null,
    originalName = null,
    onOpenHelp,
    onToast,
  } = props;

  // Garde robuste: assure qu'on a data OU r
  if (!hasProp(props, 'data') && !hasProp(props, 'r')) {
    throw new Error('HelpPanel: prop manquante — fournissez `data` ou `r`.');
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
    // ✅ correction: suppression de la parenthèse en trop
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

  return (
    <div className="card p-6 shadow-lg mx-auto max-w-3xl" data-reveal>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500">Aide & export</div>
        <button
          onClick={onOpenHelp || (() => {})}
          className="text-sm underline underline-offset-2 hover:text-indigo-700"
        >
          Fermer
        </button>
      </div>

      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Utilisez ces données (ALT, titre, légende, JSON-LD, sitemap) pour optimiser votre image dans le CMS.
        </p>
        <p>
          Le nom de fichier SEO doit être descriptif, clair et cohérent avec la page d’atterrissage.
        </p>
      </div>

      <div className="mt-5">
        <button onClick={downloadCsv} className="btn">
          Export CSV (aide)
        </button>
      </div>
    </div>
  );
      }
