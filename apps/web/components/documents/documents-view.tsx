"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileTextIcon,
  GitCompareIcon,
  Loader2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api/client";
import { uploadDocument } from "@/lib/api/upload";
import { useOrg } from "@/components/org-provider";
import { Markdown } from "@/components/markdown";
import { CitationList, type InsightCitation } from "@/components/insights/citation-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  error: string | null;
  title: string | null;
  summary: string | null;
  topics: string[] | null;
  created_at: string;
}

interface ComparisonResult {
  result_markdown: string;
  citations: InsightCitation[];
}

const statusStyles: Record<Document["status"], string> = {
  uploaded: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/15 text-blue-500",
  ready: "bg-emerald-500/15 text-emerald-500",
  failed: "bg-destructive/15 text-destructive",
};

export function DocumentsView() {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [focus, setFocus] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const orgId = activeOrg?.id;

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, response } = await api.GET("/documents");
      if (!data) {
        throw new Error(`Failed to load documents (${response.status})`);
      }
      return data as Document[];
    },
    refetchInterval: (query) =>
      (query.state.data ?? []).some(
        (d) => d.status === "uploaded" || d.status === "processing",
      )
        ? 2500
        : false,
  });

  const upload = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["documents", orgId] });
    },
    onError: (uploadError) => setError(uploadError.message),
  });

  const remove = useMutation({
    mutationFn: async (documentId: string) => {
      const { response, error: body } = await api.DELETE("/documents/{document_id}", {
        params: { path: { document_id: documentId } },
      });
      if (!response.ok) {
        throw new Error(errorMessage(body, `Delete failed (${response.status})`));
      }
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["documents", orgId] });
    },
    onError: (removeError) => setError(removeError.message),
  });

  const compare = useMutation({
    mutationFn: async () => {
      const { data, response, error: body } = await api.POST("/insights/compare", {
        body: {
          document_ids: [...selected],
          ...(focus.trim() ? { focus: focus.trim() } : {}),
        },
      });
      if (!data) {
        throw new Error(errorMessage(body, `Comparison failed (${response.status})`));
      }
      return data as unknown as ComparisonResult;
    },
    onSuccess: (comparison) => {
      setResult(comparison);
      setCompareOpen(false);
      setFocus("");
    },
  });

  const readyDocuments = (documents ?? []).filter((d) => d.status === "ready");

  function toggleSelected(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          PDF, TXT or Markdown — up to 20 MB. Ready documents become searchable in chat.
        </p>
        <div className="flex items-center gap-2">
          {selected.size >= 2 ? (
            <Button variant="outline" onClick={() => setCompareOpen(true)} disabled={compare.isPending}>
              {compare.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <GitCompareIcon className="size-4" />
              )}
              Compare ({selected.size})
            </Button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                upload.mutate(file);
              }
              event.target.value = "";
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            Upload
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (documents ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No documents yet — upload one to start chatting with your content.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {(documents ?? []).map((document) => (
            <li key={document.id}>
              <Card>
                <CardContent className="flex items-start gap-3 py-4">
                  {document.status === "ready" ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${document.name} for comparison`}
                      className="mt-1.5 size-4 accent-primary"
                      checked={selected.has(document.id)}
                      onChange={() => toggleSelected(document.id)}
                    />
                  ) : null}
                  <FileTextIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/documents/${document.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {document.title ?? document.name}
                      </Link>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          statusStyles[document.status],
                        )}
                      >
                        {document.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{document.name}</p>
                    {document.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {document.summary}
                      </p>
                    ) : null}
                    {document.error ? (
                      <p className="mt-1 text-sm text-destructive">{document.error}</p>
                    ) : null}
                    {document.topics?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {document.topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${document.name}`}
                    onClick={() => remove.mutate(document.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {readyDocuments.length >= 2 && selected.size === 0 ? (
        <p className="text-xs text-muted-foreground">
          Select two or more ready documents to compare them side by side.
        </p>
      ) : null}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compare {selected.size} documents</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {readyDocuments
                .filter((d) => selected.has(d.id))
                .map((d) => d.title ?? d.name)
                .join(" · ")}
            </p>
            <Input
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              placeholder="Optional focus — e.g. payment terms"
            />
            {compare.error ? (
              <p className="text-sm text-destructive">{compare.error.message}</p>
            ) : null}
            <Button disabled={compare.isPending} onClick={() => compare.mutate()}>
              {compare.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Compare documents
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={result !== null} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {result ? (
            <>
              <DialogHeader>
                <DialogTitle>Comparison</DialogTitle>
              </DialogHeader>
              <Markdown>{result.result_markdown}</Markdown>
              <CitationList citations={result.citations} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
