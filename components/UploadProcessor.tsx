"use client";

import React, { useRef, useState } from "react";

/** Types renvoyés par /api/process */
type ProcessPayload = {
  ok: true;
  mime: string;
  size: number;
  originalName: string;
  result: {
    alt: string;
    keywords: string[];
    filename: string;  // slug + bonne extension
    title: string;
    caption: string;
    structuredData: any; // JSON-LD
    sitemapSnippet: string;
  };
};
type ProcessError = { error: string };

type Row = {
  originalFile: File;
  api: ProcessPayload["result"];
  originalName: string;
  mime: string;
  size: number;
};

export default function UploadProcessor() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  /* -------------------- Utils -------------------- */
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  const MAX = 5 * 1024 * 1024;

  function toast(msg: string, kind: "ok" | "err" = "ok") {
    const el = document.createElement("div");
    el.textContent = msg;
    el.className =
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-md px-3 py-1.5 text-xs shadow " +
      (kind === "ok" ? "bg-slate-900 text-white" : "bg-rose-600 text-white");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  async function copyText(text: string, label = "Copié ✅") {
    try {
      await navigator.clipboard.writeText(text);
      toast(label, "ok");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast(label, "ok");
    }
  }

  function validate(file: File): string | null {
    if (!ALLOWED.includes(file.type)) return "Format non supporté. Utilisez JPG, PNG ou WEBP.";
    if (file.size > MAX) return "Fichier trop volumineux (max 5 Mo).";
    return null;
  }

  function extOf(nameOrMime: string) {
    if (nameOrMime.startsWith("image/")) {
      return nameOrMime === "image/png" ? ".png" : nameOrMime === "image/webp" ? ".webp" : ".jpg";
    }
    const m = nameOrMime.match(/\.[a-z0-9]+$/i);
    return m ? m[0].toLowerCase() : ".jpg";
  }

  function downloadRenamed(file: File, newFilename: string) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = newFilename || ("image" + extOf(file.name));
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "original_name",
      "mime",
      "size_bytes",
      "filename",
      "alt",
      "keywords",
      "title",
      "caption",
    ];
    const csvRows = rows.map((r) => [
      r.originalName,
      r.mime,
      String(r.size),
      r.api.filename,
      r.api.alt,
      r.api.keywords.join(", "),
      r.api.title,
      r.api.caption,
    ]);
    const escape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const content = [headers, ...csvRows].map((arr) => arr.map(escape).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tagos_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Export CSV ✅");
  }

  /* -------------------- Handlers -------------------- */
  async function send(file: File) {
    setErrorMsg(null);
    const err = validate(file);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setBusy(true);

    // preview
    setPreviewName(file.name);
    const u = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(u);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/process", { method: "POST", body: fd });
      const data = (await res.json()) as ProcessPayload | ProcessError;

      if (!res.ok || "error" in data) {
        throw new Error(("error" in data && data.error) || "Erreur serveur");
      }

      const payload = data as ProcessPayload;
      setRows((prev) => [
        {
          originalFile: file,
          api: payload.result,
          originalName: payload.originalName,
          mime: payload.mime,
          size: payload.size,
        },
        ...prev,
      ]);
      toast("Analyse terminée ✅");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur inconnue");
      toast("Échec de l’analyse ❌", "err");
    } finally {
      setBusy(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void send(f);
    e.currentTarget.value = "";
  }
  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void send(f);
  }
  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }

  /* -------------------- UI -------------------- */
  const last = rows[0];

  return (
    <section id="try" className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-2xl font-semibold text-center">Essayez maintenant</h2>
      <p className="mt-2 text-sm text-gray-600 text-center">
        1 image ⇒ ALT, mots-clés, nom de fichier, title, légende, JSON-LD & snippet sitemap.
      </p>

      <div className="mt-6">
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            "block rounded-2xl border-2 border-dashed p-8 transition shadow-sm mx-auto max-w-3xl cursor-pointer",
            dragging ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 bg-white",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onInputChange}
            disabled={busy}
            className="hidden"
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <div className="font-medium text-slate-900">Glissez une image ici</div>
              <div className="text-xs text-slate-500 mt-1">ou</div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
              >
                Choisir un fichier
              </button>
            </div>

            {previewUrl && (
              <div className="w-full sm:w-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="aperçu"
                  loading="lazy"
                  decoding="async"
                  className="h-28 w-28 object-cover rounded-xl border border-slate-200 shadow mx-auto"
                />
                <p className="mt-2 text-[11px] text-slate-500 text-center truncate max-w-[11rem]">
                  {previewName}
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500 text-center">
            JPG, PNG, WEBP — 5&nbsp;Mo max. Les fichiers ne sont pas conservés.
          </p>
        </label>

        {busy && (
          <div
            className="mt-5 rounded-xl border bg-white p-5 text-sm flex items-center gap-3 mx-auto max-w-3xl"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin"></span>
            Génération en cours…
            <span className="sr-only">Veuillez patienter, génération en cours</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm p-4 mx-auto max-w-3xl">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Résultat le plus récent */}
      {last && !busy && !errorMsg && (
        <div className="mt-8 grid gap-6">
          <ResultCard
            row={last}
            onCopy={copyText}
            onDownload={() => downloadRenamed(last.originalFile, last.api.filename)}
          />
        </div>
      )}

      {/* Exports agrégés */}
      <div className="mt-6">
        <button
          type="button"
          onClick={exportCSV}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          disabled={!rows.length}
          title={rows.length ? "Exporter les résultats en CSV" : "Aucun résultat à exporter"}
        >
          Export CSV ({rows.length})
        </button>
      </div>
    </section>
  );
}

/* -------------------- Sous-composant: carte de résultats -------------------- */
function ResultCard({
  row,
  onCopy,
  onDownload,
}: {
  row: Row;
  onCopy: (t: string, label?: string) => void;
  onDownload: () => void;
}) {
  const r = row.api;
  const jsonldPretty = JSON.stringify(r.structuredData, null, 2);
  const keywordsStr = r.keywords.join(", ");

  return (
    <div className="rounded-2xl border p-5 shadow-sm mx-auto max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <h3 className="text-lg font-semibold">{r.title || "Résultat"}</h3>
        <span className="rounded-full border px-3 py-1 text-xs text-gray-600">{r.filename}</span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Texte ALT" value={r.alt} onCopy={() => onCopy(r.alt)} />
          <Field label="Mots-clés" value={keywordsStr} onCopy={() => onCopy(keywordsStr)} />
          <Field label="Titre" value={r.title} onCopy={() => onCopy(r.title)} />
          <Field label="Légende" value={r.caption} onCopy={() => onCopy(r.caption)} />
        </div>
        <div className="space-y-3">
          <FieldCode
            label="JSON-LD (ImageObject)"
            value={jsonldPretty}
            onCopy={() => onCopy(jsonldPretty, "JSON-LD copié ✅")}
          />
          <FieldCode
            label="Snippet Sitemap (image)"
            value={r.sitemapSnippet}
            onCopy={() => onCopy(r.sitemapSnippet, "Snippet copié ✅")}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onDownload}
          className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
          type="button"
        >
          Télécharger l’image renommée
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium">{label}</div>
      <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm">{value}</pre>
      <button
        type="button"
        onClick={onCopy}
        className="mt-1 inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Copier
      </button>
    </div>
  );
}

function FieldCode({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium">{label}</div>
      <pre className="overflow-auto rounded-lg border bg-gray-50 p-3 text-xs leading-relaxed">{value}</pre>
      <button
        type="button"
        onClick={onCopy}
        className="mt-1 inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        Copier
      </button>
    </div>
  );
      }
