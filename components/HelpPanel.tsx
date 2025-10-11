// components/HelpPanel.tsx
'use client';

import React, { useMemo } from 'react';

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
   - { data?: SeoResult }    (nouveau, optionnel)
   - { r?: SeoResult }       (ancien usage, optionnel)
   + props de modal: open / onClose / defaultTab
*/
type PropsBase = {
  // Modal controls
  open?: boolean;                 // si false => ne rend rien
  onClose?: () => void;
  defaultTab?: string;            // "cms" | "seo" | "faq" | string

  // Contexte image (facultatif)
  previewUrl?: string | null;
  originalFile?: File | null;
  originalName?: string | null;

  onOpenHelp?: () => void;        // compat ancien bouton
  onToast?: (msg: string) => void;
};

type Props =
  | (PropsBase & { data?: SeoResult; r?: never })
  | (PropsBase & { r?: SeoResult; data?: never });

function hasProp<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

export default function HelpPanel(props: Props) {
  const {
    open = true,
    onClose,
    defaultTab = 'cms',
    previewUrl = null,
    originalFile = null,
    originalName = null,
    onOpenHelp,
    onToast,
  } = props;

  // Si le panneau est fermé, on ne rend rien (évite l’erreur d’attributs)
  if (!open) return null;

  // Récupère les données SEO si fournies (sinon undefined)
  const data: SeoResult | undefined = useMemo(() => {
    if (hasProp(props, 'data') && props.data) return props.data as SeoResult;
    if (hasProp(props, 'r') && props.r) return props.r as SeoResult;
    return undefined;
  }, [props]);

  const keywordsStr = data ? data.keywords.join(', ') : '';

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
    if (!data) {
      toast('Aucune donnée à exporter.');
      return;
    }
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
    // ✅ CSV correct
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
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Aide & export"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">
            Aide & export {defaultTab ? <span className="text-slate-400">· {defaultTab}</span> : null}
          </div>
          <div className="flex items-center gap-3">
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="text-sm underline underline-offset-2 hover:text-indigo-700"
              >
                Plus d’infos
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Utilisez ces repères pour intégrer proprement vos images dans le CMS : nom de
            fichier SEO, ALT descriptif, title, légende, JSON-LD et balise sitemap.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Nom de fichier SEO</strong> : clair, descriptif, mots séparés par des tirets.
            </li>
            <li>
              <strong>ALT</strong> : fidèle au visuel, utile pour l’accessibilité.
            </li>
            <li>
              <strong>Title & légende</strong> : cohérents avec la page cible.
            </li>
            <li>
              <strong>JSON-LD</strong> : ajoutez un <code>ImageObject</code> si votre page l’exige.
            </li>
            <li>
              <strong>Sitemap image</strong> : déclarez l’URL et les métadonnées associées.
            </li>
          </ul>

          {/* Bloc “Aperçu” si on a une image */}
          {(previewUrl || originalName) && (
            <div className="mt-3 grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <div className="text-xs text-slate-500 mb-2">Aperçu</div>
                <div className="aspect-square rounded-lg overflow-hidden border bg-slate-50 grid place-items-center">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="aperçu"
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
                <div className="text-xs text-slate-500 mb-2">Détails</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div><span className="text-slate-500">Onglet :</span> {defaultTab}</div>
                  {data && (
                    <>
                      <div><span className="text-slate-500">Fichier :</span> {data.filename}</div>
                      <div><span className="text-slate-500">ALT :</span> {data.alt}</div>
                      <div><span className="text-slate-500">Mots-clés :</span> {keywordsStr}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions CSV si données disponibles */}
          {data ? (
            <div className="pt-3">
              <button onClick={downloadCsv} className="rounded-md px-3 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-500">
                Export CSV (données image)
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Aucune donnée d’image fournie à ce panneau. Les fonctions d’export apparaîtront quand une image sera traitée.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
