"use client";
import { useEffect, useState } from "react";

type Row = { filename: string; src?: string; alt_text: string; tags: string[] };
type Resp = { alt_text: string; tags: string[] } | { error: string };

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState("fr");            // fr | en | es
  const [style, setStyle] = useState("neutral");     // neutral | ecommerce | editorial
  const [left, setLeft] = useState(0);
  const MAX_FREE = 20;

  useEffect(() => {
    const used = Number(localStorage.getItem("free_uses") || "0");
    setLeft(Math.max(0, MAX_FREE - used));
  }, []);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setBusy(true);
    const newRows: Row[] = [];

    for (const f of files) {
      // garde-fous
      if (!["image/jpeg","image/png","image/webp"].includes(f.type)) { setErr("Formats acceptés : JPG, PNG, WEBP"); continue; }
      if (f.size > 5 * 1024 * 1024) { setErr("Image > 5 Mo ignorée"); continue; }
      if (left <= 0) { setErr("Crédits gratuits épuisés"); break; }

      const base64 = await toBase64(f);
      const previewURL = URL.createObjectURL(f);

      try {
        const r = await fetch("/api/caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, lang, style })
        });
        const j: Resp = await r.json();

        if ("error" in j) {
          setErr(j.error || "Erreur serveur");
          continue;
        }

        newRows.push({
          filename: f.name,
          src: previewURL,
          alt_text: j.alt_text || "",
          tags: j.tags || []
        });

        // décrémente l'essai gratuit (localStorage)
        const used = Number(localStorage.getItem("free_uses") || "0") + 1;
        localStorage.setItem("free_uses", String(used));
        setLeft(Math.max(0, MAX_FREE - used));
      } catch (e: any) {
        setErr(e?.message || "Erreur réseau");
      }
    }

    // on ajoute en haut les nouveaux résultats
    setRows(prev => [...newRows, ...prev]);
    setBusy(false);
  }

  function downloadCSV() {
    if (!rows.length) return;
    const header = "filename,alt_text,tags\n";
    const body = rows.map(r =>
      `"${r.filename.replace(/"/g,'""')}","${r.alt_text.replace(/"/g,'""')}","${r.tags.join("|").replace(/"/g,'""')}"`
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tagos_alt_tags.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        {/* HERO */}
        <header className="text-center">
          <h1 className="text-4xl font-extrabold leading-tight">Optimisez vos images automatiquement.</h1>
          <p className="text-sm text-gray-600 mt-2">
            Tagos.io génère des textes ALT et tags SEO — en un clic.
          </p>
        </header>

        {/* CONTROLS */}
        <section className="flex flex-wrap items-center gap-3 justify-center">
          <select value={lang} onChange={e=>setLang(e.target.value)} className="border rounded px-2 py-1 bg-white">
            <option value="fr">Français</option><option value="en">English</option><option value="es">Español</option>
          </select>
          <select value={style} onChange={e=>setStyle(e.target.value)} className="border rounded px-2 py-1 bg-white">
            <option value="neutral">Neutre</option><option value="ecommerce">E-commerce</option><option value="editorial">Éditorial</option>
          </select>
          <span className="text-xs text-gray-700">Essais restants : <b>{left}</b></span>
        </section>

        {/* UPLOADER */}
        <section className="text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-black file:px-4 file:py-2 file:text-white file:hover:opacity-90"
          />
          <p className="text-xs text-gray-500 mt-2">JPG, PNG, WEBP — max 5 Mo par image.</p>
          {busy && <p className="text-gray-700 text-sm mt-2 animate-pulse">Analyse en cours…</p>}
          {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
        </section>

        {/* RESULTS */}
        <section className="bg-white border rounded p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">Déposez des images pour générer vos balises SEO.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Résultats ({rows.length})</h2>
                <button onClick={downloadCSV} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">
                  Télécharger CSV
                </button>
              </div>

              <ul className="space-y-3">
                {rows.map((r, i) => (
                  <li key={i} className="border rounded p-3">
                    <div className="flex items-start gap-3">
                      {r.src && <img src={r.src} alt="" className="w-20 h-20 object-cover rounded border" />}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{r.filename}</div>
                        <div className="mt-1 text-sm">
                          <span className="font-semibold">ALT :</span> {r.alt_text || "—"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {r.tags?.length ? r.tags.map((t, k)=>(
                            <span key={k} className="text-xs px-2 py-1 border rounded bg-gray-50">{t}</span>
                          )) : <span className="text-xs text-gray-500">—</span>}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={()=>navigator.clipboard.writeText(r.alt_text)}
                            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                          >
                            Copier l’ALT
                          </button>
                          <button
                            onClick={()=>navigator.clipboard.writeText(r.tags.join(", "))}
                            className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                          >
                            Copier les tags
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-gray-500">
          Nous ne stockons pas vos images. Chaque traitement est à la demande.
        </footer>
      </div>
    </main>
  );
}

/* utils */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); resolve(s.split(",")[1] || ""); };
    r.onerror = reject; r.readAsDataURL(file);
  });
}
