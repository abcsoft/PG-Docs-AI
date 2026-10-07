"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileBarChartIcon, FileTextIcon, Loader2Icon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api/client";

interface ReportSummary {
  id: string;
  title: string;
  instructions: string;
  document_ids: string[];
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  status: string;
  title: string | null;
}

const REPORT_IDEAS = [
  "Summarize payment commitments across these documents",
  "Draft a vendor risk assessment with severity ratings",
  "Compare obligations and deadlines across the selected contracts",
];

export function ReportsView() {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const orgId = activeOrg?.id;

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, response } = await api.GET("/reports");
      if (!data) throw new Error(`Failed to load reports (${response.status})`);
      return data as ReportSummary[];
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Generate cited reports from your documents.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          New report
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (reports ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No reports yet — create one from your uploaded documents.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {(reports ?? []).map((report) => (
            <li key={report.id}>
              <Link href={`/reports/${report.id}`} className="block">
                <Card>
                  <CardContent className="flex items-start gap-3 py-4 hover:bg-accent/40">
                    <FileBarChartIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{report.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {report.instructions}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {report.document_ids.length} document
                        {report.document_ids.length === 1 ? "" : "s"} ·{" "}
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateReportDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() =>
          queryClient.invalidateQueries({ queryKey: ["reports", orgId] })
        }
      />
    </div>
  );
}

function CreateReportDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data: documents } = useQuery({
    queryKey: ["documents", "for-report"],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.GET("/documents");
      return ((data ?? []) as Document[]).filter((d) => d.status === "ready");
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, response, error: body } = await api.POST("/reports", {
        body: {
          title: title.trim(),
          instructions: instructions.trim(),
          document_ids: [...selected],
        },
      });
      if (!data) throw new Error(errorMessage(body, `Report failed (${response.status})`));
      return data;
    },
    onSuccess: (report) => {
      setError(null);
      onCreated();
      onOpenChange(false);
      setTitle("");
      setInstructions("");
      setSelected(new Set());
      window.location.href = `/reports/${report.id}`;
    },
    onError: (createError) => setError(createError.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New report</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-title">Title</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Vendor assessment — Q2"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-instructions">Instructions</Label>
            <textarea
              id="report-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder={REPORT_IDEAS[0]}
              rows={3}
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-wrap gap-1.5">
              {REPORT_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setInstructions(idea)}
                  className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {idea.length > 42 ? `${idea.slice(0, 42)}…` : idea}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Documents ({selected.size} selected)</Label>
            <div className="max-h-44 overflow-y-auto rounded-md border p-2">
              {(documents ?? []).length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">
                  No ready documents — upload and process documents first.
                </p>
              ) : (
                (documents ?? []).map((document) => (
                  <label
                    key={document.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.has(document.id)}
                      onChange={() =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          if (next.has(document.id)) {
                            next.delete(document.id);
                          } else {
                            next.add(document.id);
                          }
                          return next;
                        })
                      }
                    />
                    <FileTextIcon className="size-3.5 text-muted-foreground" />
                    <span className="truncate">{document.title ?? document.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            disabled={
              !title.trim() || instructions.trim().length < 3 || selected.size === 0 || create.isPending
            }
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {create.isPending ? "Writing your report…" : "Generate report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
