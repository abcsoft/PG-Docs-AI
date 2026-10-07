"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  FileTextIcon,
  ListChecksIcon,
  Loader2Icon,
  ScrollTextIcon,
  ShieldAlertIcon,
  TableIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Markdown } from "@/components/markdown";
import { CitationList, type InsightCitation } from "@/components/insights/citation-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface DocumentDetail {
  id: string;
  name: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  error: string | null;
  title: string | null;
  language: string | null;
  summary: string | null;
  topics: string[] | null;
  created_at: string;
}

interface DocumentChunk {
  id: string;
  page: number | null;
  position: number;
  content: string;
}

interface Insight {
  id: string;
  kind: "summary" | "key_points" | "risks" | "extraction" | "comparison";
  template_name: string | null;
  result_markdown: string;
  citations: InsightCitation[];
  model: string;
  created_at: string;
}

interface ExtractionTemplate {
  id: string;
  name: string;
  description: string | null;
  builtin: boolean;
}

const kindMeta = {
  summary: { label: "Summary", icon: ScrollTextIcon },
  key_points: { label: "Key points", icon: ListChecksIcon },
  risks: { label: "Risks", icon: ShieldAlertIcon },
} as const;

type SingleKind = keyof typeof kindMeta;

export function DocumentView({ documentId }: { documentId: string }) {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
  const orgId = activeOrg?.id;

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", orgId, documentId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, response } = await api.GET("/documents/{document_id}", {
        params: { path: { document_id: documentId } },
      });
      if (!data) throw new Error(`Failed to load the document (${response.status})`);
      return data as DocumentDetail;
    },
  });

  const { data: chunks } = useQuery({
    queryKey: ["document-chunks", orgId, documentId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await api.GET("/documents/{document_id}/chunks", {
        params: { path: { document_id: documentId } },
      });
      return (data ?? []) as DocumentChunk[];
    },
  });

  const { data: insights } = useQuery({
    queryKey: ["document-insights", orgId, documentId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await api.GET("/documents/{document_id}/insights", {
        params: { path: { document_id: documentId } },
      });
      return (data ?? []) as unknown as Insight[];
    },
  });

  const runKind = useMutation({
    mutationFn: async (kind: SingleKind) => {
      const { data, response, error } = await api.POST(
        "/documents/{document_id}/insights",
        { params: { path: { document_id: documentId } }, body: { kind } },
      );
      if (!data) throw new Error(errorMessage(error, `Generation failed (${response.status})`));
      return data as unknown as Insight;
    },
    onSuccess: (insight) => {
      setActiveInsight(insight);
      void queryClient.invalidateQueries({
        queryKey: ["document-insights", orgId, documentId],
      });
    },
  });

  const ready = document?.status === "ready";

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!document) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Document not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          All documents
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <FileTextIcon className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">
            {document.title ?? document.name}
          </h1>
        </div>
        {document.summary ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{document.summary}</p>
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
        {document.error ? <p className="mt-2 text-sm text-destructive">{document.error}</p> : null}
      </div>

      {ready ? (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(kindMeta) as SingleKind[]).map((kind) => {
            const meta = kindMeta[kind];
            return (
              <Button
                key={kind}
                variant="outline"
                size="sm"
                disabled={runKind.isPending}
                onClick={() => runKind.mutate(kind)}
              >
                {runKind.isPending && runKind.variables === kind ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <meta.icon className="size-4" />
                )}
                {meta.label}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setExtractOpen(true)}>
            <TableIcon className="size-4" />
            Extract data
          </Button>
          {runKind.error ? (
            <p className="self-center text-sm text-destructive">
              {runKind.error instanceof Error ? runKind.error.message : "Generation failed"}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Insights unlock once the document has finished processing.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">History</h2>
        {(insights ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights generated yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(insights ?? []).map((insight) => (
              <li key={insight.id}>
                <button
                  type="button"
                  onClick={() => setActiveInsight(insight)}
                  className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent/50"
                >
                  <span className="font-medium">
                    {insight.kind === "extraction"
                      ? `Extraction — ${insight.template_name ?? "custom"}`
                      : insight.kind === "comparison"
                        ? "Comparison"
                        : kindMeta[insight.kind as SingleKind]?.label ?? insight.kind}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(insight.created_at).toLocaleString()} · {insight.citations.length}{" "}
                    sources
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">
          Source chunks{" "}
          <span className="font-normal text-muted-foreground">
            ({(chunks ?? []).length} indexed)
          </span>
        </h2>
        <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
          {(chunks ?? []).map((chunk) => (
            <div key={chunk.id} className="rounded-lg border p-3">
              <p className="mb-1 font-mono text-[10px] text-muted-foreground">
                {chunk.page != null ? `page ${chunk.page}` : "no page"} · position {chunk.position}
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {chunk.content}
              </p>
            </div>
          ))}
          {(chunks ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing indexed yet.</p>
          ) : null}
        </div>
      </section>

      <Dialog open={activeInsight !== null} onOpenChange={(open) => !open && setActiveInsight(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {activeInsight ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {activeInsight.kind === "extraction"
                    ? `Extraction — ${activeInsight.template_name ?? "custom"}`
                    : activeInsight.kind === "comparison"
                      ? "Comparison"
                      : kindMeta[activeInsight.kind as SingleKind]?.label ?? activeInsight.kind}
                </DialogTitle>
              </DialogHeader>
              <Markdown>{activeInsight.result_markdown}</Markdown>
              <CitationList citations={activeInsight.citations} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ExtractDialog
        documentId={documentId}
        open={extractOpen}
        onOpenChange={setExtractOpen}
        onGenerated={(insight) => {
          setActiveInsight(insight);
          void queryClient.invalidateQueries({
            queryKey: ["document-insights", orgId, documentId],
          });
        }}
      />
    </div>
  );
}

function ExtractDialog({
  documentId,
  open,
  onOpenChange,
  onGenerated,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (insight: Insight) => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["extraction-templates"],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.GET("/extraction-templates");
      return (data ?? []) as unknown as ExtractionTemplate[];
    },
  });

  const extract = useMutation({
    mutationFn: async () => {
      const { data, response, error: body } = await api.POST("/insights/extract", {
        body: { document_id: documentId, template_id: templateId },
      });
      if (!data) throw new Error(errorMessage(body, `Extraction failed (${response.status})`));
      return data as unknown as Insight;
    },
    onSuccess: (insight) => {
      setError(null);
      onOpenChange(false);
      onGenerated(insight);
    },
    onError: (extractError) => setError(extractError.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extract structured data</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Choose a template…" />
              </SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <span className={cn(template.builtin ? "" : "font-medium")}>
                      {template.name}
                      {template.builtin ? " (built-in)" : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            disabled={!templateId || extract.isPending}
            onClick={() => extract.mutate()}
          >
            {extract.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Run extraction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
