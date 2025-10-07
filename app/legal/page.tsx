export const metadata = {
  title: "Mentions légales — Tagos.io",
  description:
    "Mentions légales de Tagos.io : éditeur, hébergeur, contact, propriété intellectuelle, responsabilité.",
};

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Mentions légales</h1>
        <p className="mt-2 text-slate-600 text-sm">Conformément aux articles 6-III et 19 de la loi n°2004-575 (LCEN).</p>

        <section className="mt-8 space-y-6 text-sm leading-6">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">1. Éditeur du site</h2>
            <p className="mt-2">
              <b>Tagos.io</b> — Outil d’optimisation d’images.<br />
              Contact : <a className="text-indigo-600 underline" href="mailto:contact@tagos.io">contact@tagos.io</a>
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">2. Hébergeur</h2>
            <p className="mt-2">
              <b>Vercel Inc.</b><br />
              440 N Barranca Ave #4133, Covina, CA 91723, USA<br />
              <a className="text-indigo-600 underline" href="https://vercel.com">vercel.com</a>
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">3. Propriété intellectuelle</h2>
            <p className="mt-2">
              Le site, sa structure, ses textes, logos et éléments graphiques sont protégés par le droit de la propriété intellectuelle.
              Toute reproduction non autorisée est interdite.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">4. Responsabilité</h2>
            <p className="mt-2">
              Tagos.io fournit un outil d’aide à l’optimisation des images. 
              L’intégration finale sur votre site et ses effets sur le référencement dépendent de multiples facteurs externes 
              (qualité du contenu, netlinking, concurrence, performance technique), hors du contrôle de Tagos.io.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">5. Données personnelles</h2>
            <p className="mt-2">
              Consultez notre <a className="text-indigo-600 underline" href="/privacy">Politique de confidentialité</a> 
              pour connaître les traitements, vos droits et nos engagements.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">6. Contact</h2>
            <p className="mt-2">
              Pour toute question :{" "}
              <a className="text-indigo-600 underline" href="mailto:contact@tagos.io">contact@tagos.io</a>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
