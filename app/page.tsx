'use client';

import React, { useState } from 'react';

export default function HomePage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ alt_text: string; tags: string[] } | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération des tags.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              ALT & tags SEO pour images
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Des balises ALT <span className="text-indigo-600">claires</span>. En un clic.
            </h1>
            <p className="mt-4 text-slate-600">
              Déposez vos images. Tagos génère un ALT utile et 3–5 tags pertinents. Compatible WordPress, Shopify, Webflow et HTML.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#try" className="btn btn-primary">Essayer gratuitement</a>
              <a href="#how" className="btn">Comment ça marche</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Pas de compte • 10 essais gratuits • Aucune image stockée</p>
          </div>

          <div className="card p-5 bg-gradient-to-b from-slate-50 to-white">
            <div className="text-sm font-medium mb-2">Exemple de sortie</div>
            <div className="text-sm">
              <span className="font-semibold">ALT :</span>{" "}
              <span className="text-slate-700">Chaussures en cuir noir pour homme sur fond blanc</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["chaussures","cuir","noir","homme","mode"].map((t,i)=>
                <span key={i} className="chip">{t}</span>
              )}
            </div>
            <div className="mt-4 text-xs text-slate-500">Généré par IA — format court et descriptif</div>
          </div>
        </div>
      </header>

      {/* TOOL */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-5">Essayez maintenant</h2>

        <label className="block text-sm font-medium mb-2 text-slate-700">Téléversez une image :</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={busy}
          className="block w-full border border-slate-300 rounded-lg p-2 text-sm"
        />

        {busy && (
          <div className="mt-4 animate-pulse card p-5 bg-slate-50 text-slate-400 text-sm">
            Génération en cours...
          </div>
        )}

        {result && (
          <div className="mt-5 card p-5">
            <div className="text-sm">
              <strong>ALT :</strong> {result.alt_text}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.tags.map((tag, i) => (
                <span key={i} className="chip">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-10 border-t border-slate-200">
        <h2 className="text-xl font-semibold mb-5">Pourquoi les ALT comptent</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="card p-4"><b>Visibilité</b> — Descriptions = meilleures positions sur Google Images.</div>
          <div className="card p-4"><b>Temps gagné</b> — Évitez de rédiger chaque ALT à la main.</div>
          <div className="card p-4"><b>Accessibilité</b> — Un ALT clair aide tous les visiteurs.</div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-10 border-t border-slate-200">
        <h2 className="text-xl font-semibold mb-5">Comment ça marche</h2>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="card p-4"><div className="text-2xl mb-1">1</div>Téléversez vos images (JPG, PNG, WEBP).</li>
          <li className="card p-4"><div className="text-2xl mb-1">2</div>L’IA génère un ALT court + 3–5 tags.</li>
          <li className="card p-4"><div className="text-2xl mb-1">3</div>Copiez ou téléchargez un CSV pour votre CMS.</li>
        </ol>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-4 py-10 border-t border-slate-200 text-sm text-slate-500">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <p>© 2025 Tagos.io — Tous droits réservés.</p>
          <div className="flex gap-3">
            <a href="/privacy" className="hover:text-slate-700">Confidentialité</a>
            <a href="mailto:contact@tagos.io" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
        }
