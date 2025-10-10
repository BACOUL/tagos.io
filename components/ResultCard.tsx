// components/ResultCard.tsx
"use client";
import CopyButton from "./CopyButton";

export type ProcessResult = {
  alt: string;
  keywords: string[];
  filename: string;
  title: string;
  caption: string;
  structuredData: any; // JSON-LD
  sitemapSnippet: string;
};

export default function ResultCard({ r }: { r: ProcessResult }) {
  const jsonldPretty = JSON.stringify(r.structuredData, null, 2);
  const keywordsStr = r.keywords.join(", ");

  return (
    <div className="rounded-2xl border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold">{r.title || "Résultat"}</h3>
        <span className="rounded-full border px-3 py-1 text-xs text-gray-600">{r.filename}</span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-sm font-medium">Texte ALT</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm">{r.alt}</pre>
            <CopyButton text={r.alt} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Mots-clés</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm">{keywordsStr}</pre>
            <CopyButton text={keywordsStr} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Titre</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm">{r.title}</pre>
            <CopyButton text={r.title} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Légende</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm">{r.caption}</pre>
            <CopyButton text={r.caption} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 text-sm font-medium">JSON-LD (ImageObject)</div>
            <pre className="overflow-auto rounded-lg border bg-gray-50 p-3 text-xs leading-relaxed">
{jsonldPretty}
            </pre>
            <CopyButton text={jsonldPretty} label="Copier JSON-LD" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Snippet Sitemap (image)</div>
            <pre className="overflow-auto rounded-lg border bg-gray-50 p-3 text-xs leading-relaxed">{r.sitemapSnippet}</pre>
            <CopyButton text={r.sitemapSnippet} label="Copier snippet" />
          </div>
        </div>
      </div>
    </div>
  );
}
