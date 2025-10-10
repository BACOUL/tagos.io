// components/UploadClient.tsx
"use client";

import { useRef, useState } from "react";
import ResultCard, { type ProcessResult } from "./ResultCard";

type ApiResponse =
  | { ok: true; result: ProcessResult; mime: string; size: number; originalName: string }
  | { error: string };

export default function UploadClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{ originalName: string; mime: string; size: number; data: ProcessResult }>
  >([]);

  function openPicker() {
    inputRef.current?.click();
  }

  async function onFile(file: File) {
    setErr(null);
    if (!file.type.startsWith("image/")) {
      setErr("Veuillez sélectionner un fichier image (jpg, png, webp).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("Taille maximale: 5 Mo.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/process", { method: "POST", body: fd });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || "error" in json) {
        throw new Error(("error" in json && json.error) || "Erreur serveur.");
      }
      setResults(prev => [
        {
          originalName: json.originalName,
          mime: json.mime,
          size: json.size,
          data: json.result,
        },
        ...prev,
      ]);
    } catch (e: any) {
      setErr(e.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    // reset pour pouvoir renvoyer le même fichier si besoin
    e.currentTarget.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
  }

  function exportCSV() {
    if (!results.length) return;
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
    const rows = results.map(r => [
      escapeCsv(r.originalName),
      r.mime,
      String(r.size),
      escapeCsv(r.data.filename),
      escapeCsv(r.data.alt),
      escapeCsv(r.data.keywords.join(", ")),
      escapeCsv(r.data.title),
      escapeCsv(r.data.caption),
    ]);
    const content = [headers, ...rows].map(cols => cols.join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tagos_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeCsv(s: string) {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  return (
    <section id="try" className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="text-2xl font-semibold">Essayez maintenant</h2>
      <p className="mt-2 text-sm text-gray-600">Une image ⇒ ALT, keywords, nom de fichier, titre, légende, JSON-LD et snippet sitemap.</p>

      <div className="mt-6 rounded-2xl border border-dashed p-8">
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl p-10 text-center"
          htmlFor="file"
        >
          <input
            ref={inputRef}
            id="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onInputChange}
          />
          <div className="text-lg font-medium">
            {loading ? "Analyse en cours…" : "Glissez une image ou cliquez pour choisir"}
          </div>
          <div className="text-xs text-gray-500">Formats: JPG, PNG, WebP • Max 5 Mo</div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
            >
              Choisir un fichier
            </button>
          </div>
          {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        </label>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={exportCSV}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          disabled={!results.length}
          title={results.length ? "Exporter les résultats en CSV" : "Aucun résultat à exporter"}
        >
          Export CSV ({results.length})
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-8 grid gap-6">
          {results.map((r, i) => (
            <ResultCard key={i} r={r.data} />
          ))}
        </div>
      )}
    </section>
  );
      }
