"use client";
import { useEffect, useState } from "react";

type Row = { filename: string; src?: string; alt_text: string; tags: string[] };
type Resp = { alt_text: string; tags: string[] } | { error: string };

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<"fr" | "en" | "es">("fr");
  const [style, setStyle] = useState<"neutral" | "ecommerce" | "editorial">("neutral");
  const [left, setLeft] = useState(0);
  const MAX_FREE = 10;

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
      if (!["image/jpeg","image/png","image/webp"].includes(f.type)) { setErr("Formats : JPG, PNG, WEBP"); continue; }
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

  return (
    <main>
      {/* NAV */}
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand)] text-white text-[12px] font-bold">T</span>
            <span className="font-semibold tracking-tight">Tagos.io</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#how" className="hover:underline">Fonctionnement</a>
            <a href="#pricing" className="hover:underline">Tarifs</a>
            <a href="#try" className="btn">Essayer</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.05]">
              Des balises ALT <span className="text-[var(--brand)]">claires</span>.<br/>En un clic.
            </h1>
            <p className="mt-4 text-[color:var(--muted)]">
              Déposez vos images, obtenez des textes ALT utiles et quelques tags SEO. Compatible WordPress, Shopify, Webflow et HTML.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#try" className="btn btn-primary">Essayer gratuitement</a>
              <a href="#why" className="btn">Pourquoi c’est utile</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Pas de compte • 10 essais gratuits • Aucune image stockée</p>
          </div>

          <div className="card p-5">
            <div className="text-sm font-medium mb-2">Exemple de sortie</div>
            <div className="text-sm">
              <span className="font-semibold">ALT :</span>{" "}
              <span className="text-slate-700">Chaussures en cuir noir pour homme sur fond blanc</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["chaussures","cuir","noir","homme","mode"].map((t,i)=>
                <span key={i} className="chip">{t}</span>
              )}
            </div>
            <div className="mt-4 text-xs text-slate-500">Généré par IA — format court et descriptif</div>
          </div>
        </div>

        {/* logos discrets */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-80">
          {["WordPress","Shopify","Webflow","HTML"].map((n,i)=>(
            <div key={i} className="text-center text-xs card p-2">{n}</div>
          ))}
        </div>
      </header>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-10 border-t border-slate-200">
        <h2 className="text-xl font-semibold mb-5">Pourquoi les ALT comptent</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="card p-4"><b>Visibilité</b> — Descriptions = meilleures positions sur Google Images.</div>
          <div className="card p-4"><b>Temps gagné</b> — Évitez de rédiger chaque ALT à la main.</div>
          <div className="card p-4"><b>Accessibilité</b> — Un ALT clair aide tous les visiteurs.</div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-10 border-t border-slate-200">
        <h2 className="text-xl font-semibold mb-5">Fonctionnement</h2>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="card p-4"><div className="text-2xl mb-1">1</div>Téléversez vos images (JPG, PNG, WEBP).</li>
          <li className="card p-4"><div className="text-2xl mb-1">2</div>L’IA génère un ALT court + 3–5 tags pertinents.</li>
          <li className="card p-4"><div className="text-2xl mb-1">3</div>Copiez, ou téléchargez un CSV pour votre CMS.</li>
        </ol>
      </section>

      {/* TOOL */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <select value={lang} onChange={e=>setLang(e.target.value as any)} className="btn">
            <option value="fr">Français</option><option value="en">English</option><option value="es">Español</option>
          </select>
          <select value={style} onChange={e=>setStyle(e.target.value as any)} className="btn">
            <option value="neutral">Neutre</option><option value="ecommerce">E-commerce</option><option value="editorial">Éditorial</option>
          </select>
          <span className="text-xs text-slate-600 ml-auto">Essais restants : <b>{left}</b></span>
        </div>

        <div className="mt-3 card p-4 bg-slate-50">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-white file:hover:bg-[var(--brand-700)]"
          />
          <p className="text-xs text-slate-500 mt-2">Max 5 Mo par image.</p>
          {busy && <p className="text-sm mt-2 animate-pulse">Analyse en cours…</p>}
          {err && <p className="text-sm mt-2 text-red-600">{err}</p>}

          <div className="mt-4 card p-3 bg-white">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-600">Déposez des images pour générer vos balises.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">Résultats ({rows.length})</div>
                  <button onClick={downloadCSV} className="btn text-xs">Télécharger CSV</button>
                </div>
                <ul className="space-y-3">
                  {rows.map((r, i) => (
                    <li key={i} className="card p-3">
                      <div className="flex items-start gap-3">
                        {r.src && <img src={r.src} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{r.filename}</div>
                          <div className="mt-1 text-sm"><span className="font-semibold">ALT :</span> {r.alt_text || "—"}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {r.tags?.length ? r.tags.map((t, k)=>(
                              <span key={k} className="chip">{t}</span>
                            )) : <span className="text-xs text-slate-500">—</span>}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={()=>navigator.clipboard.writeText(r.alt_text)} className="btn text-xs">Copier l’ALT</button>
                            <button onClick={()=>navigator.clipboard.writeText(r.tags.join(", "))} className="btn text-xs">Copier les tags</button>
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

      {/* PRICING (sobre) */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 border-t border-slate-200">
        <h2 className="text-xl font-semibold mb-5">Tarifs simples</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-sm font-semibold">Starter</div>
            <div className="text-2xl font-bold mt-1">4,90 €</div>
            <div className="text-xs text-slate-600 mt-1">100 images</div>
            <ul className="text-sm mt-3 space-y-1">
              <li>• ALT + tags</li><li>• Export CSV</li><li>• Email support</li>
            </ul>
            <button className="btn w-full mt-4">Choisir</button>
          </div>
          <div className="card p-5 border-[var(--brand)] ring-1 ring-[var(--brand)]">
            <div className="text-sm font-semibold">Pro</div>
            <div className="text-2xl font-bold mt-1">19,90 €</div>
            <div className="text-xs text-slate-600 mt-1">1000 images</div>
            <ul className="text-sm mt-3 space-y-1">
              <li>• ALT + tags</li><li>• CSV + lot</li><li>• Support prioritaire</li>
            </ul>
            <button className="btn btn-primary w-full mt-4">Choisir</button>
          </div>
          <div className="card p-5">
            <div className="text-sm font-semibold">Entreprise</div>
            <div className="text-2xl font-bold mt-1">Sur devis</div>
            <div className="text-xs text-slate-600 mt-1">10 000+ images</div>
            <ul className="text-sm mt-3 space-y-1">
              <li>• API / plugin</li><li>• SLA & RGPD</li><li>• Intégration dédiée</li>
            </ul>
            <a href="mailto:contact@tagos.io" className="btn w-full mt-4">Nous contacter</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-600">
          © {new Date().getFullYear()} Tagos.io — <a className="underline" href="mailto:contact@tagos.io">contact@tagos.io</a> • Nous ne stockons pas vos images.
        </div>
      </footer>
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
