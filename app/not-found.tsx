import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-slate-900 grid place-items-center px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold mb-4 shadow">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Page introuvable
        </h1>
        <p className="mt-3 text-slate-600">
          Désolé, cette page n’existe pas ou a été déplacée. Retournez à l’accueil pour
          continuer.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="btn btn-primary shadow-md shadow-indigo-600/20"
          >
            ⤶ Revenir à l’accueil
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Besoin d’aide ?{" "}
          <a className="underline text-indigo-600" href="mailto:contact@tagos.io">
            contact@tagos.io
          </a>
        </p>
      </div>
    </main>
  );
}
