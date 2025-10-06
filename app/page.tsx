"use client";
import { useEffect, useState } from "react";

type Row = { filename: string; src?: string; alt_text: string; tags: string[] };
type Resp = { alt_text: string; tags: string[] } | { error: string };

export default function Home() {
  // -------- state --------
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<"fr" | "en" | "es">("fr");
  const [style, setStyle] = useState<"neutral" | "ecommerce" | "editorial">("neutral");
  const [left, setLeft] = useState(0);
  const MAX_FREE = 10; // sobre et crédible

  useEffect(() => {
    const used = Number(localStorage.getItem("free_uses") || "0");
    setLeft(Math.max(0, MAX_FREE - used));
  }, []);

  // -------- actions --------
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setBusy(true);
    const newRows: Row[] = [];

    for (const f of files) {
      if (!["image/jpeg","image/png","image/webp"].includes(f.type)) { setErr("Formats acceptés : JPG, PNG, WEBP"); continue; }
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

  // -------- UI --------
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      {/* NAV */}
      <nav className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Tagos.io</div>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#how" className="hover:underline">Comment ça marche</a>
            <a href="#pricing" className="hover:underline">Tarifs</a>
            <a href="#try" className="px-3 py-1 rounded border hover:bg-zinc-50">Essayer</a>
          </div>
        </div>
      </nav>

      {/* HERO (sobre, centré sur la valeur) */}
      <header className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1]">
              Des balises ALT utiles.<br />Automatiquement.
            </h1>
            <p className="mt-4 text-zinc-600">
              Déposez vos images, obtenez des textes ALT clairs et quelques tags pertinents pour le SEO.
              Compatible WordPress, Shopify, Webflow et HTML.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#try" className="px-4 py-2 rounded bg-black text-white hover:opacity-90">Essayer gratuitement</a>
              <a href="#why" className="px-4 py-2 rounded border hover:bg-zinc-50">Pourquoi c’est utile</a>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Pas de compte • Pas de stockage d’images • 10 essais gratuits</p>
          </div>
          <div className="rounded-2xl border p-4 bg-zinc-50">
            <div className="text-sm font-medium mb-2">Exemple de sortie</div>
            <div className="text-sm">
              <span className="font-semibold">ALT :</span>{" "}
              <span className="text-zinc-700">Chaussures en cuir noir pour homme sur fond blanc</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["chaussures","cuir","noir","homme","mode"].map((t,i)=>
                <span key={i} className="text-xs px-2 py-1 border rounded bg-white">{t}</span>
              )}
            </div>
            <div className="mt-3 text-xs text-zinc-500">Généré par IA • format court et descriptif</div>
          </div>
        </div>

        {/* Social proof simple (logos placeholders) */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-70">
          {["WordPress","Shopify","Webflow","HTML"].map((n,i)=>(
            <div key={i} className="text-center text-xs border rounded p-2">{n}</div>
          ))}
        </div>
      </header>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-10 border-t">
        <h2 className="text-xl font-semibold mb-5">Pourquoi les ALT comptent (et pourquoi Tagos aide)</h2>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="border rounded-lg p-3">
            <b>Visibilité</b> — Une image bien décrite ressort mieux sur Google Images.
          </div>
          <div className="border rounded-lg p-3">
            <b>Gain de temps</b> — Évitez de rédiger chaque ALT à la main.
          </div>
          <div className="border rounded-lg p-3">
            <b>Accessibilité</b> — Un ALT clair aide aussi vos visiteurs non voyants.
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-10 border-t">
        <h2 className="text-xl font-semibold mb-5">Comment ça marche</h2>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li className="border rounded-lg p-4 bg-zinc-50">
            <div className="text-2xl mb-1">1</div>
            Téléversez vos images (JPG, PNG, WEBP).
          </li>
          <li className="border rounded-lg p-4 bg-zinc-50">
            <div className="text-2xl mb-1">2</div>
            L’IA génère un ALT court + 3–5 tags pertinents.
          </li>
          <li className="border rounded-lg p-4 bg-zinc-50">
            <div className="text-2xl mb-1">3</div>
            Copiez, ou téléchargez un CSV pour import dans votre CMS.
          </li>
        </ol>
      </section>

      {/* TOOL (ton produit intégré) */}
      <section id="try" className="mx-auto max-w-6xl px-4 py-12 border-t">
        <div className="flex flex-wrap items-center gap-3">
          <select value={lang} onChange={e=>setLang(e.target.value as any)} className="border rounded px-2 py-1 bg-white">
            <option value="fr">Français</option><option value="en">English</option><option value="es">Español</option>
          </select>
          <select value={style} onChange={e=>setStyle(e.target.value as any)} className="border rounded px-2 py-1 bg-white">
            <option value="neutral">Neutre</option><option value="ecommerce">E-commerce</option><option value="editorial">Éditorial</option>
          </select>
          <span className="text-xs text-zinc-600 ml-auto">Essais restants : <b>{left}</b></span>
        </div>

        <div className="mt-3 rounded-xl border p-4 bg-zinc-50">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-black file:px-4 file:py-2 file:text-white file:hover:opacity-90"
          />
          <p className="text-xs text-zinc-500 mt-2">Max 5 Mo par image.</p>
          {busy && <p className="text-sm mt-2 animate-pulse">Analyse en cours…</p>}
          {err && <p className="text-sm mt-2 text-red-600">{err}</p>}

          <div className="mt-4 bg-white border rounded p-3">
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-600">Déposez des images pour générer vos balises.</p>
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

      {/* PRICING (sobre, crédible) */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 border-t">
        <h2 className="text-xl font-semibold mb-5">Tarifs simples</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="border rounded-xl p-4">
            <div className="text-sm font-semibold">Starter</div>
            <div className="text-2xl font-bold mt-1">4,90 €</div>
            <div className="text-xs text-zinc-600 mt-1">100 images</div>
            <ul className="text-sm mt-3 space-y-1">
              <li>• Génération ALT + tags</li>
              <li>• CSV export</li>
              <li>• Assistance email</li>
            </ul>
            <button className="mt-4 w-full text-sm px-3 py-2 rounded border hover:bg-zinc-50">Choisir</button>
          </div>
          <div className="border rounded-xl p-4 bg-zinc-50">
            <div className="text-sm font-semibold">Pro</div>
            <div className="text-2xl font-bold mt-1">19,90 €</div>
            <div className="text-xs text-zinc-600 mt-1">1000 images</div>
            <ul className="text-sm mt-3 space-y-1">
              <li>• Génération ALT + tags</li>
              <li>• CSV + mode lot</li>
              <li>• Priorité support</li>
            </ul>
            <button className="mt-4 w-full text-sm px-3 py-2 rounded bg-black text-white hover:opacity-90">Choisir</button>
          </div>
          <div className="border rounded-xl p-4">
            <div className="text-sm font-semibold">Entreprise</div>
            <div className="text-2xl font-bold mt-1">Sur devis</div>
            <div className="text-xs text-zinc-600 mt-1">10 000+ images</div>
            <ul className="text-sm mt-3 space-y-1">
              <li>• API / plugin</li>
              <li>• SLA & RGPD</li>
              <li>• Intégration dédiée</li>
            </ul>
            <a href="mailto:contact@tagos.io" className="mt-4 block w-full text-center text-sm px-3 py-2 rounded border hover:bg-zinc-50">Nous contacter</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-12 border-t">
        <h2 className="text-xl font-semibold mb-5">Questions fréquentes</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="border rounded-lg p-3">
            <b>Stockez-vous les images ?</b>
            <p className="text-zinc-600 mt-1">Non. Traitement à la demande, aucune image n’est conservée.</p>
          </div>
          <div className="border rounded-lg p-3">
            <b>Puis-je utiliser sur WordPress / Shopify ?</b>
            <p className="text-zinc-600 mt-1">Oui. Copiez l’ALT ou importez le CSV. Un plugin arrive.</p>
          </div>
          <div className="border rounded-lg p-3">
            <b>Langues disponibles ?</b>
            <p className="text-zinc-600 mt-1">Français, anglais, espagnol (sélecteur en haut de l’outil).</p>
          </div>
          <div className="border rounded-lg p-3">
            <b>Essai gratuit ?</b>
            <p className="text-zinc-600 mt-1">10 images gratuites pour tester sereinement.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-zinc-600">
          © {new Date().getFullYear()} Tagos.io — <a className="underline" href="mailto:contact@tagos.io">contact@tagos.io</a> •
          <span> </span>Nous ne stockons pas vos images. Données traitées à la demande.
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
