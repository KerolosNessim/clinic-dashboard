"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ExportFinancialPdfButton({
  from,
  to,
  totalRevenue,
  totalExpenses,
  netProfit,
  branches,
}: {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  branches: { branchName: string; revenue: number; expenses: number; netProfit: number }[];
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    setIsGenerating(true);
    try {
      const [{ pdf }, { FinancialReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./financial-report-pdf"),
      ]);

      const blob = await pdf(
        <FinancialReportPdf
          from={from}
          to={to}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          netProfit={netProfit}
          branches={branches}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financial-report-${from}-to-${to}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button type="button" className="bg-red-700 hover:bg-red-600 text-white" onClick={handleExport} disabled={isGenerating}>
      {isGenerating && <Spinner />}
      تصدير PDF
      <FileDown data-icon="inline-end" />
    </Button>
  );
}
