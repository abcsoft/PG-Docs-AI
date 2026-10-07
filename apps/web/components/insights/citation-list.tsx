import Link from "next/link";
import { FileTextIcon } from "lucide-react";

export interface InsightCitation {
  marker: number | null;
  document_id: string;
  document_name: string;
  page: number | null;
  snippet: string;
}

/** Numbered source list under an insight — markers match the [n] markers in
 * the generated markdown, so every claim can be traced to its chunk. */
export function CitationList({ citations }: { citations: InsightCitation[] }) {
  if (!citations.length) {
    return null;
  }
  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Sources</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {citations.map((citation, index) => (
          <li key={`${citation.document_id}:${citation.page}:${index}`}>
            <Link
              href={`/documents/${citation.document_id}`}
              title={citation.snippet}
              className="inline-flex max-w-full items-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {citation.marker != null ? (
                <span className="mt-px rounded bg-muted px-1 font-mono text-[10px] leading-4">
                  {citation.marker}
                </span>
              ) : (
                <FileTextIcon className="mt-0.5 size-3 shrink-0" />
              )}
              <span className="truncate">
                {citation.document_name}
                {citation.page != null ? ` · p.${citation.page}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
