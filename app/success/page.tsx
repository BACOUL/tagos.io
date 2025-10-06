"use client";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");
    if (!session_id) { setStatus("error"); setMsg("Session Stripe introuvable"); return; }

    fetch(`/api/grant-credits?session_id=${encodeURIComponent(session_id)}`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) { setStatus("ok"); setMsg(`Crédits ajoutés : +${j.added} (total ${j.total})`); }
        else { setStatus("error"); setMsg(j.error || "Erreur"); }
      })
      .catch(() => { setStatus("error"); setMsg("Erreur réseau"); });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded p-6">
        <h1 className="text-2xl font-bold mb-2">Paiement réussi ✅</h1>
        {status === "loading" && <p>Validation de vos crédits…</p>}
        {status === "ok" && <p>{msg}</p>}
        {status === "error" && <p className="text-red-600">Erreur: {msg}</p>}
        <a href="/" className="inline-block mt-4 px-4 py-2 rounded bg-black text-white">Retour</a>
      </div>
    </main>
  );
}
