"use client";
import { useEffect, useState } from "react";

type Row = { filename: string; alt_text: string; tags: string[] };
type Resp = { alt_text: string; tags: string[] } | { error: string };

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState("fr");
  const [style, setStyle] = useState("neutral");
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
    const out: Row[] = [];
    for (const f of files) {
      if (!["image/jpeg","image/png","image/webp"].includes(f.type)) { setErr("Formats: JPG/PNG/WEBP"); continue; }
      if (f.size > 5 * 1024 * 1024) { setErr("Image > 5 Mo ignorée"); continue; }
      if (left <= 0) { setErr("Crédits gratuits épuisés"); break; }

      const b64 = await toBase64(f);
      const r = await fetch("/api/caption", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ imageBase64: b64, lang, style })
      });
      const j: Resp = await r.json();
      if ("error" in j) { setErr(j.error || "Erreur"); continue; }

      out.push({ filename: f.name, alt_text: j.alt_text || "", tags: j.tags || [] });

      const used = Number(localStorage.getItem("free_uses") || "0") + 1;
      localStorage.setItem("free_uses", String(used));
      setLeft(Math.max(0, MAX_FREE - used));
    }
    setRows(prev => [...out, ...prev]);
    setBusy(false);
  }

  function downloadCSV() {
    const header = "filename,alt_text,tags\n";
    const body = rows.map(r =>
      `"${r.filename.replace(/"/g,'""')}","${r.alt_text.replace(/"/g,'""')}","${r.tags.join("|").replace(/"/g,'""')}"`
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "tagos_alt_tags.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        {/* HERO */}
        <header className="text-center">
          <h1 className="text-3xl font-bold">Optimisez vos images automatiquement.</h1>
          <p className="text-sm text-gray-600 mt-1">Tagos.io génère des textes ALT et tags SEO — en un clic.</p>
        </header>

        {/* CONTROLS */}
        <section className="flex flex-wrap items-center gap-3 justify-center">
          <select value={lang} onChange={e=>setLang(e.target.value)} className="border rounded px-2 py-1 bg-white">
            <option value="fr">Français</option><option value="en">English</option><option value="es">Español</option>
          </select>
          <select value={style} onChange={e=>setStyle(e.target.value)} className="border rounded px-2 py-1 bg-white">
            <option value="neutral">Neutre</option><option value="ecommerce">E-commerce</option><option value="editorial">Éditorial</option>
          </select>
          <span className="text-xs text-gray-600">Essais restants : <b>{left}</b></span>
        </section>

        {/* UPLOADER */}
        <section className="text-center">
          <input type="file" accept="image/*" multiple onChange={onFiles}
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-black file:px-4 file:py-2 file:text-white file:hover:opacity-90" />
          <p className="text-xs text-gray-500 mt-2">JPG, PNG, WEBP — max 5 Mo par image.</p>
          {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
          {busy && <p className="text-gray-600 text-sm mt-2 animate-pulse">Analyse en cours…</p>}
        </section>

        {/* RESULTS */}
        <section className="bg-white border rounded p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">Déposez des images pour générer vos balises SEO.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Résultats ({rows.length})</h2>
                <div className="flex gap-2">
                  <button onClick={downloadCSV} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">Télécharger CSV</button>
                </div>
              </div>
              <ul className="space-y-3">
                {rows.map((r, i) => (
                  <li key={i} className="border rounded p-3">
                    <div className="text-sm font-medium">{r.filename}</div>
                    <div className="mt-1 text-sm"><span className="font-semibold">ALT :</span> {r.alt_text || "—"}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {r.tags?.length ? r.tags.map((t, k)=>(
                        <span key={k} className="text-xs px-2 py-1 border rounded bg-gray-50">{t}</span>
                      )) : <span className="text-xs text-gray-500">—</span>}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={()=>navigator.clipboard.writeText(r.alt_text)} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">Copier l’ALT</button>
                      <button onClick={()=>navigator.clipboard.writeText(r.tags.join(", "))} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">Copier les tags</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* CTA BAS DE PAGE */}
        <footer className="text-center text-xs text-gray-500">
          Nous ne stockons pas vos images. Chaque traitement est à la demande.
        </footer>
      </div>
    </main>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); resolve(s.split(",")[1] || ""); };
    r.onerror = reject; r.readAsDataURL(file);
  });
                    }
