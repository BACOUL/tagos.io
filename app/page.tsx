"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const [count, setCount] = useState(2340);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<{
    alt_text: string;
    tags: string[];
    filename: string;
  } | null>(null);

  // Animation compteur images optimisées
  useEffect(() => {
    const timer = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 3)), 5000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/optimize", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Erreur pendant l’optimisation. Réessayez.");
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `ALT : ${result.alt_text}\nTags : ${result.tags.join(", ")}\nNom : ${result.filename}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
          Rendez vos images visibles
        </h1>
        <p className="text-lg text-slate-600 mt-4">
          Tagos optimise automatiquement vos images pour le référencement :
          ALT clair, mots-clés pertinents et nom de fichier prêt pour Google.
        </p>

        <div className="mt-10">
          <label className="inline-block cursor-pointer px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition">
            Choisir une image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </section>

      {/* Bandeau "Repéré par" */}
      <section className="mb-14 text-center text-sm text-slate-500">
        <p>🔍 Déjà repéré par des professionnels du web et du e-commerce</p>
        <div className="flex justify-center gap-8 mt-4 opacity-80">
          <img src="/logos/shopify.svg" alt="Shopify" className="h-6 grayscale" />
          <img src="/logos/wordpress.svg" alt="WordPress" className="h-6 grayscale" />
          <img src="/logos/prestashop.svg" alt="PrestaShop" className="h-6 grayscale" />
          <img src="/logos/webflow.svg" alt="Webflow" className="h-6 grayscale" />
        </div>
      </section>

      {/* Résultat */}
      {preview && (
        <motion.section
          className="bg-slate-50 border rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <img
              src={preview}
              alt="Prévisualisation"
              className="w-48 h-48 object-cover rounded-xl shadow-md"
            />
            {result ? (
              <div className="flex-1 space-y-3">
                <p>
                  <strong>ALT :</strong> {result.alt_text}
                </p>
                <p>
                  <strong>Mots-clés :</strong> {result.tags.join(", ")}
                </p>
                <p>
                  <strong>Nom de fichier :</strong> {result.filename}
                </p>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  {isCopied ? "Copié ✅" : "Copier tout"}
                </button>
              </div>
            ) : (
              <p className="text-slate-500">Analyse en cours...</p>
            )}
          </div>
        </motion.section>
      )}

      {/* Compteur dynamique */}
      <section className="mt-16 text-center">
        <p className="text-2xl font-semibold text-indigo-600">
          {count.toLocaleString("fr-FR")} images optimisées
        </p>
        <p className="text-slate-500 text-sm mt-1">depuis septembre 2025</p>
      </section>

      {/* Section testeurs */}
      <section className="mt-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Rejoignez les premiers testeurs
        </h2>
        <p className="text-slate-600 mt-2">
          Essayez gratuitement (3 images/jour) et recevez les nouveautés avant tout le monde.
        </p>

        <form
          action="https://example.com/api/newsletter"
          method="POST"
          className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <input
            type="email"
            name="email"
            placeholder="Votre e-mail"
            required
            className="px-4 py-2 border rounded-lg w-64 text-slate-800"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Devenir testeur
          </button>
        </form>
      </section>

      {/* Transparence produit */}
      <section className="mt-20 text-center text-slate-500 text-sm border-t pt-10">
        <p>🔒 <strong>Transparence Tagos</strong></p>
        <p className="mt-2 max-w-lg mx-auto">
          Tagos est actuellement en pré-lancement.  
          Chaque optimisation est faite instantanément, sans stocker d’image.  
          Nous améliorons le modèle chaque semaine selon les retours des premiers utilisateurs.
        </p>
      </section>
    </main>
  );
}
