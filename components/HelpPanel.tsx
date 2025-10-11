
'use client';

import React from 'react';

type HelpPanelProps = {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'cms' | 'zip';
};

function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className="relative w-[min(900px,94vw)] max-h-[86vh] overflow-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 id="help-title" className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Fermer l’aide"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="font-medium">{title}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" className={open ? 'rotate-180 transition' : 'transition'} aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-2 text-sm text-slate-700">{children}</div>}
    </div>
  );
}

export default function HelpPanel({ open, onClose, defaultTab = 'cms' }: HelpPanelProps) {
  const [tab, setTab] = React.useState<'cms' | 'zip'>(defaultTab);
  React.useEffect(() => setTab(defaultTab), [defaultTab]);

  return (
    <Modal open={open} onClose={onClose} title="Comment intégrer vos livrables Tagos ?">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('cms')}
          className={'px-3 py-1.5 rounded-md text-sm ' + (tab === 'cms' ? 'bg-indigo-600 text-white' : 'bg-slate-100')}
        >
          Intégrer dans le CMS
        </button>
        <button
          onClick={() => setTab('zip')}
          className={'px-3 py-1.5 rounded-md text-sm ' + (tab === 'zip' ? 'bg-indigo-600 text-white' : 'bg-slate-100')}
        >
          Pack ZIP
        </button>
      </div>

      {tab === 'cms' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Voici comment utiliser les <strong>4 livrables principaux</strong> : <em>nom de fichier</em>, <em>ALT</em>, <em>TITLE</em>, <em>légende</em>.
          </p>

          <Accordion title="WordPress (Médiathèque)">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Téléversez l’image optimisée (ou renommez d’abord le fichier local avec le <em>nom SEO</em> proposé).</li>
              <li>Dans la colonne droite, champ <strong>Texte alternatif</strong> → collez l’ALT Tagos.</li>
              <li>Champ <strong>Titre</strong> (facultatif) → collez le TITLE.</li>
              <li>Si vous affichez une légende sous l’image → champ <strong>Légende</strong>.</li>
            </ol>
          </Accordion>

          <Accordion title="Shopify (fiches produits, images thème)">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Importez l’image dans <strong>Contenu &gt; Fichiers</strong> ou directement sur la fiche produit.</li>
              <li>Assurez-vous d’utiliser le <strong>nom de fichier</strong> optimisé.</li>
              <li>Dans la fiche produit, <strong>Description de l’image (ALT)</strong> → collez l’ALT Tagos.</li>
              <li>La <strong>Légende</strong> peut être ajoutée dans la description produit (champ riche) si vous l’affichez.</li>
            </ol>
          </Accordion>

          <Accordion title="Webflow">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Importez l’image dans l’Asset Manager avec le <strong>nom</strong> optimisé.</li>
              <li>Dans les réglages de l’image, remplissez le <strong>ALT</strong> et (si utile) le <strong>TITLE</strong>.</li>
              <li>Ajoutez la <strong>Légende</strong> dans le bloc texte sous l’image si votre design l’affiche.</li>
            </ol>
          </Accordion>

          <Accordion title="Données structurées (JSON-LD) & Sitemap image">
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>JSON-LD</strong> : copiez le bloc et collez-le dans le HTML de la page (entre <code>&lt;script type="application/ld+json"&gt;</code> et <code>&lt;/script&gt;</code>), ou via votre plugin SEO (WP Rocket/Yoast/RankMath).</li>
              <li><strong>Sitemap image</strong> : ajoutez le snippet XML dans votre sitemap (ou un sitemap dédié images) puis soumettez-le dans la Search Console.</li>
            </ul>
          </Accordion>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Le <strong>Pack ZIP</strong> contient : l’image optimisée, <em>ALT</em>, <em>TITLE</em>, <em>Légende</em>, <code>structuredData.json</code> et le snippet <code>sitemap-image.xml</code>.
          </p>
          <p className="text-sm text-slate-600">
            Téléchargez-le puis intégrez chaque élément selon votre CMS (onglet précédent).
          </p>
        </div>
      )}
    </Modal>
  );
}
