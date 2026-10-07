import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Cited, exportable reports generated from your documents.
        </p>
      </div>
      <ReportsView />
    </div>
  );
}
