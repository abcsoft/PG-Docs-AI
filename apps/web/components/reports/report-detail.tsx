"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useOrg } from "@/components/org-provider";
import { Markdown } from "@/components/markdown";
import { CitationList, type InsightCitation } from "@/components/insights/citation-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";

interface ReportDetail {
  id: string;
  title: string;
  instructions: string;
  content_md: string;
  citations: InsightCitation[];
  model: string;
  created_at: string;
}

export function ReportDetail({ reportId }: { reportId: string }) {
  const { activeOrg } = useOrg();

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", activeOrg?.id, reportId],
    enabled: !!activeOrg,
    queryFn: async () => {
      const { data, response } = await api.GET("/reports/{report_id}", {
        params: { path: { report_id: reportId } },
      });
      if (!data) throw new Error(`Failed to load the report (${response.status})`);
      return data as unknown as ReportDetail;
    },
  });

  function download() {
    if (!report) return;
    const blob = new Blob([report.content_md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.title.replace(/[^\w\d-]+/g, "-").toLowerCase()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!report) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Report not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          All reports
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{report.title}</h1>
          <Button variant="outline" size="sm" onClick={download}>
            <DownloadIcon className="size-4" />
            Export Markdown
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {report.instructions} · {new Date(report.created_at).toLocaleString()} · {report.model}
        </p>
      </div>
      <Card>
        <CardContent className="py-4">
          <Markdown>{report.content_md}</Markdown>
          <CitationList citations={report.citations} />
        </CardContent>
      </Card>
    </div>
  );
}
