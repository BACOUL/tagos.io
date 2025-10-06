"use client";
import { useEffect, useState } from "react";

type Row = { filename: string; src?: string; alt_text: string; tags: string[] };
type Resp = { alt_text: string; tags: string[] } | { error: string };

export default function Home() {
  // ------- state -------
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<"fr" | "en" | "es">("fr");
  const [style, setStyle] = useState<"neutral" | "ecommerce" | "editorial">("neutral");
  const [left, setLeft] = useState(0);
  const MAX_FREE = 20;

  useEffect(() => {
    const used = Number(localStorage.getItem("free_uses") || "0");
    setLeft(Math.max(0, MAX_FREE - used));
  }, []);

  // ------- actions -------
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setBusy(true);
    const newRows: Row[] = [];

    for (const f of files) {
      if (!["image/jpeg","image/png","image/webp"].includes(f.type)) { setErr("Formats: JPG, PNG, WEBP"); continue; }
      if (f.size > 5 * 1024 * 1024) { setErr("Image > 5 Mo ignorée"); continue; }
      if (left <= 0) { setErr("Essais gratuits épuisés"); break; }

      const b64 = await toBase64(f);
      const previewURL = URL.createObjectURL(f);

      try {
        const r = await fetch("/api/caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: b64, lang, style }),
        });
        const j: Resp = await r.json();
        if ("error" in j) { setErr(j.error || "Erreur serveur"); continue; }

        newRows.push({ filename: f.name, src: previewURL, alt_text: j.alt_text || "", tags: j.tags || [] });

        const used = Number(localStorage.getItem("free_uses") || "0") + 1;
        localStorage.setItem("free_uses", String(used));
        setLeft(Math.max(0, MAX_FREE - used));
      } catch (e: any) {
        setErr(e?.message || "Erreur réseau");
      }
    }

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

  // ------- UI -------
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      {/* NAV */}
      <nav className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="font-bold tracking-tight">Tagos.io</div>
          <a href="#try" className="text-sm px-3 py-1 rounded border hover:bg-zinc-50">Essayer gratuitement</a>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1]">
              Optimisez vos images <span className="whitespace-nowrap">automatiquement.</span>
            </h1>
            <p className="mt-3 text-zinc-600">
              Tagos.io génère des textes ALT et tags SEO en 1 clic. Plus de visibilité sur Google Images, moins de temps perdu.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#try" className="px-4 py-2 rounded bg-black text-white hover:opacity-90">Essayer gratuitement</a>
              <a href="#why" className="px-4 py-2 rounded border hover:bg-zinc-50">Pourquoi c’est incontournable ?</a>
            </div>
          </div>
          <div className="rounded-2xl border p-4 bg-zinc-50">
            <div className="text-sm font-medium mb-2">Exemple de résultat</div>
            <div className="text-sm">ALT : <span className="text-zinc-700">Chaussures en cuir noir pour homme sur fond blanc</span></div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["chaussures","cuir","noir","homme","mode"].map((t,i)=>
                <span key={i} className="text-xs px-2 py-1 border rounded bg-white">{t}</span>
              )}
            </div>
            <div className="mt-3 text-xs text-zinc-500">Généré par IA — sans stockage d’image</div>
          </div>
        </div>
      </header>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-5xl px-4 py-10 border-t">
        <h2 className="text-xl font-semibold mb-4">Pourquoi Tagos.io est incontournable</h2>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm">
          <li className="border rounded-lg p-3">✅ <b>SEO immédiat</b> : Google aime les images bien décrites. Tagos écrit l’ALT parfait.</li>
          <li className="border rounded-lg p-3">✅ <b>Gain de temps</b> : plus besoin de rédiger des centaines d’ALT à la main.</li>
          <li className="border rounded-lg p-3">✅ <b>Compatible partout</b> : WordPress, Shopify, Webflow, HTML…</li>
          <li className="border rounded-lg p-3">✅ <b>RGPD friendly</b> : traitement à la demande, aucune image stockée.</li>
        </ul>
      </section>

      {/* TOOL */}
      <section id="try" className="mx-auto max-w-5xl px-4 py-12 border-t">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select value={lang} onChange={e=>setLang(e.target.value as any)} className="border rounded px-2 py-1 bg-white">
            <option value="fr">Français</option><option value="en">English</option><option value="es">Español</option>
          </select>
          <select value={style} onChange={e=>setStyle(e.target.value as any)} className="border rounded px-2 py-1 bg-white">
            <option value="neutral">Neutre</option><option value="ecommerce">E-commerce</option><option value="editorial">Éditorial</option>
          </select>
          <span className="text-xs text-zinc-600 ml-auto">Essais restants : <b>{left}</b></span>
        </div>

        <div className="rounded-xl border p-4 bg-zinc-50">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-black file:px-4 file:py-2 file:text-white file:hover:opacity-90"
          />
          <p className="text-xs text-zinc-500 mt-2">JPG, PNG, WEBP — max 5 Mo par image.</p>
          {busy && <p className="text-sm mt-2 animate-pulse">Analyse en cours…</p>}
          {err && <p className="text-sm mt-2 text-red-600">{err}</p>}

          <div className="mt-4 bg-white border rounded p-3">
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-600">Déposez des images pour générer vos balises SEO.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Résultats ({rows.length})</div>
                  <button onClick={downloadCSV} className="text-xs px-3 py-1 border rounded hover:bg-zinc-50">Télécharger CSV</button>
                </div>
                <ul className="space-y-3">
                  {rows.map((r, i) => (
                    <li key={i} className="border rounded p-3">
                      <div className="flex items-start gap-3">
                        {r.src && <img src={r.src} alt="" className="w-20 h-20 object-cover rounded border" />}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{r.filename}</div>
                          <div className="mt-1 text-sm"><span className="font-semibold">ALT :</span> {r.alt_text || "—"}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {r.tags?.length ? r.tags.map((t, k)=>(
                              <span key={k} className="text-xs px-2 py-1 border rounded bg-zinc-50">{t}</span>
                            )) : <span className="text-xs text-zinc-500">—</span>}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={()=>navigator.clipboard.writeText(r.alt_text)} className="text-xs px-3 py-1 border rounded hover:bg-zinc-50">Copier l’ALT</button>
                            <button onClick={()=>navigator.clipboard.writeText(r.tags.join(", "))} className="text-xs px-3 py-1 border rounded hover:bg-zinc-50">Copier les tags</button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-8 border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-zinc-500">
          Nous ne stockons pas vos images. Chaque traitement est à la demande. — © {new Date().getFullYear()} Tagos.io
        </div>
      </footer>
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
