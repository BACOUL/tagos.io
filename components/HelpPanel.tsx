'use client';

import React, { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'cms' | 'pack';
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border bg-slate-50 text-slate-700 text-[11px]">
      {children}
    </kbd>
  );
}

export default function HelpPanel({ open, onClose, defaultTab = 'cms' }: Props) {
  const [tab, setTab] = React.useState<'cms' | 'pack'>(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Échappe avec Échap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 z-[70]"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="fixed inset-0 z-[71] grid place-items-center p-4"
      >
        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 id="help-title" className="text-sm font-semibold">
              Comment utiliser vos livrables Tagos
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-md p-2 hover:bg-slate-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
              <button
                className={`px-3 py-1.5 rounded-md ${tab === 'cms' ? 'bg-white shadow border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setTab('cms')}
              >
                Intégrer dans mon CMS
              </button>
              <button
                className={`px-3 py-1.5 rounded-md ${tab === 'pack' ? 'bg-white shadow border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setTab('pack')}
              >
                Pack SEO (ZIP)
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {tab === 'cms' ? <CmsHowTo /> : <PackHowTo />}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn">Fermer</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Sections ---------------- */

function CmsHowTo() {
  return (
    <div className="grid gap-6 text-sm">
      <Callout title="Les 4 livrables de base">
        <ul className="list-disc ml-5 space-y-1">
          <li><b>Nom de fichier</b> → utilisez le fichier renommé proposé par Tagos.</li>
          <li><b>Texte ALT</b> → description accessible, utile pour Google Images.</li>
          <li><b>Titre (title)</b> → info-bulle optionnelle.</li>
          <li><b>Légende</b> → phrase courte sous l’image (facultatif mais utile contexte).</li>
        </ul>
      </Callout>

      <Accordion title="WordPress (Médias, Gutenberg, WooCommerce)">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Téléversez l’image avec le <b>nom de fichier</b> optimisé.</li>
          <li>Dans la colonne droite (Médias ou Bloc Image), collez le <b>Texte alternatif</b>.</li>
          <li>Option : dans <b>Attribut title</b> ou champ <b>Titre</b>, collez le <b>Title</b>.</li>
          <li>Option : pour l’affichage en dessous de l’image, collez la <b>Légende</b>.</li>
        </ol>
        <Code label="Exemple d’HTML rendu (Gutenberg)">
{`<figure>
  <img src="/uploads/chaussure-course-homme-bleu.webp"
       alt="Chaussure de course homme bleu semelle légère"
       title="Chaussure Course Homme Bleu" />
  <figcaption>Chaussure de course homme bleu, semelle légère.</figcaption>
</figure>`}
        </Code>
      </Accordion>

      <Accordion title="Shopify (fiches produits, images thème)">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Importez l’image dans <b>Contenu > Fichiers</b> ou directement sur la fiche produit.</li>
          <li>Assurez-vous d’utiliser le <b>nom de fichier</b> optimisé.</li>
          <li>Dans la fiche produit, <b>Description de l’image (ALT)</b> → collez l’ALT Tagos.</li>
          <li>La <b>Légende</b> peut être ajoutée dans la description produit (champ riche) si vous l’affichez.</li>
        </ol>
        <Code label="Extrait Liquid (thème)">
{`<img
  src="{{ image | image_url }}"
  alt="{{ image.alt | escape }}"
  title="{{ image.alt | escape }}"
/>`}
        </Code>
      </Accordion>

      <Accordion title="Webflow (Designer > Asset / Image)">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Uploadez le fichier avec le <b>nom optimisé</b>.</li>
          <li>Sélectionnez l’image → <b>Alt text</b> → collez l’ALT.</li>
          <li>Si vous affichez une légende, ajoutez-la dans le <b>Rich Text</b> sous l’image.</li>
        </ol>
      </Accordion>

      <Callout title="Astuce visibilité">
        Même si vous n’affichez pas la légende côté client, <b>gardez-la dans votre CMS</b> : elle aide
        vos équipes et peut enrichir le contexte de la page.
      </Callout>
    </div>
  );
}

function PackHowTo() {
  return (
    <div className="grid gap-6 text-sm">
      <Callout title="Que contient le Pack SEO ?">
        <ul className="list-disc ml-5 space-y-1">
          <li><code>ALT.txt</code>, <code>KEYWORDS.txt</code>, <code>TITLE.txt</code>, <code>CAPTION.txt</code></li>
          <li><code>structuredData.json</code> (JSON-LD <code>ImageObject</code>)</li>
          <li><code>sitemap-image.xml</code> (snippet à coller dans votre sitemap)</li>
          <li>+ votre image <b>renommée</b></li>
        </ul>
      </Callout>

      <Accordion title="Intégrer le JSON-LD (optionnel mais recommandé)">
        <p className="text-slate-600">
          Copiez le contenu de <code>structuredData.json</code> dans une balise <code>&lt;script type="application/ld+json"&gt;</code>
          sur la page qui <b>affiche l’image</b>.
        </p>
        <Code label="Exemple à coller dans &lt;head&gt; ou juste avant &lt;/body&gt;">
{`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "name": "Titre généré par Tagos",
  "description": "ALT généré par Tagos",
  "keywords": "mot-clé 1, mot-clé 2, ...",
  "contentUrl": "https://www.votresite.com/chemin/vers/image-optimisee.webp"
}
</script>`}
        </Code>
      </Accordion>

      <Accordion title="Sitemap images (XML)">
        <p className="text-slate-600">
          Ouvrez votre <code>sitemap.xml</code> (ou le sitemap d’une section) et insérez le snippet. Remplacez l’URL
          par l’URL définitive de l’image et de la page qui l’héberge.
        </p>
        <Code label="Snippet type (à dupliquer par image)">
{`<url>
  <loc>https://www.votresite.com/page-qui-contient-l-image</loc>
  <image:image>
    <image:loc>https://www.votresite.com/medias/image-optimisee.webp</image:loc>
    <image:title>Titre généré par Tagos</image:title>
    <image:caption>ALT/Légende généré(e) par Tagos</image:caption>
  </image:image>
</url>`}
        </Code>
      </Accordion>

      <Callout title="Priorité (si vous manquez de temps)">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Utiliser le <b>nom de fichier</b> optimisé.</li>
          <li>Coller l’<b>ALT</b>.</li>
          <li>Ajouter la <b>Légende</b> si pertinente.</li>
          <li>Plus tard : JSON-LD + Sitemap pour pousser l’indexation.</li>
        </ol>
      </Callout>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-indigo-50/40 p-4">
      <div className="font-medium mb-1">{title}</div>
      <div className="text-slate-700">{children}</div>
    </div>
  );
}

function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-medium">{title}</span>
        <svg
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 text-slate-700">{children}</div>}
    </div>
  );
}

function Code({ label, children }: { label?: string; children: string }) {
  return (
    <div className="mt-2">
      {label && <div className="text-[12px] text-slate-500 mb-1">{label}</div>}
      <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
        <code>{children}</code>
      </pre>
      <div className="mt-2">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="btn"
    >
      {done ? 'Copié ✅' : 'Copier'}
    </button>
  );
      }
