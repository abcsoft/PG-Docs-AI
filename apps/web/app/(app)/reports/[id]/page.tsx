import type { Metadata } from "next";
import { ReportDetail } from "@/components/reports/report-detail";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl py-2">
      <ReportDetail reportId={id} />
    </div>
  );
}
