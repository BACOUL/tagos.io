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
      {/* TOP NAV */}
      <div className="border-b border-slate-200">
        <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 grid place-items-center text-white font-bold">T</div>
            <span className="font-semibold">Tagos.io</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#why" className="hover:text-indigo-600">Pourquoi</a>
            <a href="#how" className="hover:text-indigo-600">Comment</a>
            <a href="#pricing" className="hover:text-indigo-600">Tarifs</a>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
            <a href="#try" className="btn btn-primary">Essayer</a>
          </div>
        </nav>
      </div>

      {/* HERO — slogan validé */}
      <header className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              Optimisation d’images par IA
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
              La visibilité, <span className="text-indigo-600">automatisée</span>.
            </h1>
            <p className="mt-4 text-slate-600">
              Tagos optimise vos images pour le référencement grâce à l’intelligence artificielle.
              Balises, textes alternatifs et mots-clés générés instantanément — sans effort, sans plugin.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#try" className="btn btn-primary">🚀 Générer mes tags</a>
              <a href="#how" className="btn">Comment ça marche</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Pas de compte • Essai gratuit • Aucune image stockée</p>
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

      {/* TRUST STRIP */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2"><span className="chip">RGPD</span> Aucune image conservée</div>
          <div className="flex items-center gap-2"><span className="chip">Compatibilité</span> WordPress · Shopify · Webflow</div>
          <div className="flex items-center gap-2"><span className="chip">Qualité</span> ALT concis & descriptifs</div>
        </div>
      </section>

      {/* FEATURES (Pourquoi) */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Pourquoi choisir Tagos</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="card p-4">
            <div className="text-base font-medium mb-1">Visibilité</div>
            Des descriptions intelligentes améliorent vos positions sur Google Images et la recherche visuelle.
          </div>
          <div className="card p-4">
            <div className="text-base font-medium mb-1">Gain de temps</div>
            Générez automatiquement l’ALT et 3–5 mots-clés pertinents au lieu d’écrire à la main.
          </div>
          <div className="card p-4">
            <div className="text-base font-medium mb-1">Accessibilité</div>
            Un ALT clair rend vos contenus accessibles à tous les utilisateurs et lecteurs d’écran.
          </div>
        </div>
      </section>

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

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Comment ça marche</h2>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="card p-4"><div className="text-2xl mb-1">1</div>Téléversez vos images (JPG, PNG, WEBP).</li>
          <li className="card p-4"><div className="text-2xl mb-1">2</div>L’IA génère un ALT court + 3–5 tags pertinents.</li>
          <li className="card p-4"><div className="text-2xl mb-1">3</div>Copiez ou exportez un CSV pour votre CMS.</li>
        </ol>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-2xl font-semibold mb-6">Tarifs simples</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="text-lg font-semibold">Gratuit</div>
            <div className="mt-1 text-slate-500 text-sm">Pour tester et usages ponctuels</div>
            <div className="mt-4 text-3xl font-extrabold">0 €</div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• 10 images / jour</li>
              <li>• ALT + 3–5 tags</li>
              <li>• Export CSV</li>
            </ul>
            <a href="#try" className="btn btn-primary mt-6 inline-block">Commencer</a>
          </div>
          <div className="card p-6 border-indigo-200">
            <div className="text-lg font-semibold">Pro</div>
            <div className="mt-1 text-slate-500 text-sm">Pour sites & boutiques en croissance</div>
            <div className="mt-4 text-3xl font-extrabold">9 € <span className="text-base font-normal text-slate-500">/ 500 images</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>• Jusqu’à 500 images</li>
              <li>• Mots-clés étendus (jusqu’à 8)</li>
              <li>• Support prioritaire</li>
            </ul>
            {/* Lien Stripe à brancher plus tard */}
            <a href="#try" className="btn mt-6 inline-block">Être prévenu</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">FAQ</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="card p-4">
            <div className="font-medium mb-1">Stockez-vous mes images ?</div>
            Non. Les fichiers sont traités puis immédiatement supprimés.
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">Est-ce compatible avec mon CMS ?</div>
            Oui, vous pouvez copier/coller les résultats ou exporter un CSV pour WordPress, Shopify, Webflow, etc.
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">En quelles langues ?</div>
            Français en priorité. Anglais et Espagnol à venir.
          </div>
          <div className="card p-4">
            <div className="font-medium mb-1">Puis-je utiliser des images volumineuses ?</div>
            Jusqu’à 5 Mo par image (recommandé : JPG/WEBP optimisés).
          </div>
        </div>
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
