export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Politique de Confidentialité</h1>
      <p className="text-sm text-slate-600 mb-6">
        Dernière mise à jour : octobre 2025
      </p>
      <div className="prose prose-slate">
        <p>
          Tagos.io traite vos images afin de générer des balises ALT et des mots-clés. Les images ne sont pas stockées : elles sont traitées puis supprimées.
        </p>
        <h2>Données traitées</h2>
        <ul>
          <li>Fichiers image fournis par vous (non conservés).</li>
          <li>Métadonnées techniques minimales (journalisation anonyme).</li>
        </ul>
        <h2>Base légale</h2>
        <p>Exécution du service demandé (article 6.1.b RGPD).</p>
        <h2>Sous-traitants</h2>
        <ul>
          <li>Vercel (hébergement)</li>
          <li>OpenAI (analyse IA)</li>
          <li>Stripe (paiement, si activé)</li>
        </ul>
        <h2>Vos droits</h2>
        <p>Vous pouvez exercer vos droits (accès, rectification, suppression) en écrivant à <a href="mailto:privacy@tagos.io">privacy@tagos.io</a>.</p>
      </div>
    </main>
  );
}
