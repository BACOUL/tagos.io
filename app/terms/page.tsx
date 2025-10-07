export const metadata = {
  title: "Conditions d’utilisation — Tagos.io",
  description:
    "Conditions d’utilisation de Tagos.io : accès, limites, propriété intellectuelle, responsabilité, droit applicable.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Conditions d’utilisation</h1>
        <p className="mt-2 text-slate-600 text-sm">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

        <section className="mt-8 space-y-6 text-sm leading-6">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">1. Objet</h2>
            <p className="mt-2">
              Tagos.io permet d’optimiser des images (texte alternatif, mots-clés, renommage de fichier) afin d’améliorer
              leur compréhension par les moteurs de recherche et l’accessibilité.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">2. Accès au service</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Accès sans compte pour l’offre gratuite (quota quotidien limité côté navigateur).</li>
              <li>Les offres payantes peuvent exiger une vérification e-mail et un moyen de paiement.</li>
              <li>Tagos.io peut suspendre l’accès en cas d’abus, fraude, ou atteinte à la sécurité.</li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">3. Utilisation autorisée</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Vous vous engagez à téléverser uniquement des contenus dont vous détenez les droits d’utilisation.</li>
              <li>Interdiction de téléverser des contenus illicites, diffamatoires, ou portant atteinte à des tiers.</li>
              <li>Interdiction d’ingénierie inverse, scraping massif, ou tentative de contournement des mesures de protection.</li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">4. Données & confidentialité</h2>
            <p className="mt-2">
              Les images sont traitées en mémoire et ne sont pas conservées. Les détails figurent dans la{" "}
              <a className="text-indigo-600 underline" href="/privacy">Politique de confidentialité</a>.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">5. Propriété intellectuelle</h2>
            <p className="mt-2">
              Le site, ses éléments graphiques, logos et contenus sont protégés par le droit de la propriété intellectuelle.
              Les résultats générés (ALT, mots-clés, nom de fichier) vous sont concédés pour vos usages légitimes.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">6. Responsabilité</h2>
            <p className="mt-2">
              Tagos.io fournit un outil d’aide. Les performances SEO dépendent de nombreux facteurs externes
              (qualité éditoriale, performance technique, concurrence, backlinks). Tagos.io ne garantit pas une position
              spécifique dans les résultats de recherche. Le service est fourni « en l’état ».
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">7. Tarifs & paiements</h2>
            <p className="mt-2">
              Les prix affichés sont en euros, susceptibles d’évolution. Les packs prépayés donnent droit à un volume d’images
              et ne sont pas remboursables une fois entamés, sauf obligation légale contraire.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">8. Disponibilité</h2>
            <p className="mt-2">
              Nous visons une haute disponibilité mais n’assurons pas d’absence d’interruptions. Des opérations de maintenance
              peuvent survenir. En cas d’incident majeur, nous mettrons à jour la page d’accueil ou vous informerons par e-mail si nécessaire.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">9. Modification des conditions</h2>
            <p className="mt-2">
              Nous pouvons mettre à jour ces conditions. La version en vigueur est publiée sur cette page avec sa date de mise à jour.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">10. Droit applicable</h2>
            <p className="mt-2">
              Ces conditions sont régies par le droit français. Tout litige relèvera des juridictions compétentes.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-2">
              <a className="text-indigo-600 underline" href="mailto:contact@tagos.io">contact@tagos.io</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
