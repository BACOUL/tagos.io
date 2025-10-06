export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto py-20 px-6 text-slate-800">
      <h1 className="text-3xl font-bold mb-6 text-indigo-600">Politique de Confidentialité</h1>

      <p className="mb-6 text-slate-600">
        Chez <strong>Tagos.io</strong>, nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles.
        Cette politique explique quelles informations nous collectons, pourquoi et comment elles sont utilisées.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Données collectées</h2>
        <p>
          Nous collectons uniquement les données strictement nécessaires pour le bon fonctionnement du service :
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Images téléchargées pour la génération de tags et de descriptions.</li>
          <li>Adresse IP (temporairement) pour la sécurité et la prévention d’abus.</li>
          <li>Adresse e-mail (optionnelle) si vous nous contactez via support.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Utilisation des données</h2>
        <p>
          Les images envoyées sont traitées uniquement dans le but de générer des tags et textes alternatifs par intelligence artificielle.
          Aucune donnée n’est utilisée à des fins commerciales ou publicitaires.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Conservation et sécurité</h2>
        <p>
          Les fichiers sont supprimés automatiquement après traitement. 
          Nous ne stockons aucune image sur nos serveurs après la génération des résultats.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Vos droits</h2>
        <p>
          Conformément au RGPD, vous pouvez demander à tout moment :
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>L’accès à vos données personnelles</li>
          <li>Leur suppression immédiate</li>
          <li>Des informations sur leur utilisation</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Contact</h2>
        <p>
          Pour toute question, vous pouvez nous écrire à :{" "}
          <a href="mailto:support@tagos.io" className="text-indigo-600 underline">
            support@tagos.io
          </a>
        </p>
      </section>

      <p className="text-sm text-slate-500 mt-10">
        Dernière mise à jour : Octobre 2025 — Tagos.io © Tous droits réservés.
      </p>
    </main>
  );
}
