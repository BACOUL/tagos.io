export const metadata = {
  title: "Confidentialité — Tagos.io",
  description:
    "Politique de confidentialité de Tagos.io : données collectées, finalités, durée de conservation, vos droits RGPD.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
        <p className="mt-2 text-slate-600 text-sm">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

        <section className="mt-8 space-y-6 text-sm leading-6">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">1. Qui sommes-nous ?</h2>
            <p className="mt-2">
              Tagos.io est un service d’optimisation d’images (ALT, mots-clés, renommage). 
              Contact : <a className="text-indigo-600 underline" href="mailto:contact@tagos.io">contact@tagos.io</a>
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">2. Données traitées</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Images téléversées</b> : traitées en temps réel, non conservées côté serveur.</li>
              <li><b>Métadonnées techniques</b> : type de fichier, poids, horodatage.</li>
              <li><b>Usage local</b> : compteur d’essais gratuits stocké <b>uniquement dans votre navigateur</b> (localStorage).</li>
              <li><b>Contacts</b> (optionnel) : si vous nous écrivez par e-mail, nous conservons votre message pour le support.</li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">3. Finalités & base légale</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Fourniture du service</b> (exécution du contrat) : générer ALT, tags et renommage.</li>
              <li><b>Mesures anti-abus</b> (intérêt légitime) : limite d’essais gratuits côté client.</li>
              <li><b>Support</b> (intérêt légitime) : répondre à vos demandes.</li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">4. Durées de conservation</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Images</b> : non stockées (traitement en mémoire puis suppression).</li>
              <li><b>Logs techniques minimaux</b> (erreurs serveur) : jusqu’à 30 jours.</li>
              <li><b>Échanges e-mail</b> : durée nécessaire au support (max. 24 mois).</li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">5. Sous-traitants & hébergement</h2>
            <p className="mt-2">
              Hébergement et déploiement : <b>Vercel</b>. Certains traitements peuvent transiter par l’UE/EEA et/ou les USA 
              selon leur infrastructure. Nous limitons strictement les données envoyées aux prestataires.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">6. Transferts hors UE</h2>
            <p className="mt-2">
              Lorsqu’un transfert hors UE a lieu, il s’appuie sur des <b>clauses contractuelles types (SCC)</b> 
              ou mesures équivalentes. Nous minimisons les données et ne stockons pas vos images.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">7. Vos droits</h2>
            <p className="mt-2">
              Vous disposez des droits d’<b>accès</b>, <b>rectification</b>, <b>effacement</b>, <b>limitation</b>, 
              <b>opposition</b> et <b>portabilité</b> (art. 15 à 22 RGPD). 
              Contactez-nous : <a className="text-indigo-600 underline" href="mailto:contact@tagos.io">contact@tagos.io</a>. 
              Vous pouvez saisir la CNIL si nécessaire.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">8. Sécurité</h2>
            <p className="mt-2">
              Chiffrement TLS en transit, minimisation des données, isolation des environnements. 
              Nous n’exposons pas les images téléversées publiquement.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">9. Cookies</h2>
            <p className="mt-2">
              Par défaut, Tagos.io n’emploie pas de cookies de profilage. 
              Si des outils d’analyse sont ajoutés ultérieurement, une bannière de consentement sera affichée.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">10. Contact</h2>
            <p className="mt-2">
              Pour toute question ou exercice de droits :{" "}
              <a className="text-indigo-600 underline" href="mailto:contact@tagos.io">contact@tagos.io</a>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
              }
