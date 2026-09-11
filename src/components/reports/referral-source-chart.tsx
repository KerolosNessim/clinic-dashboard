"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const PALETTE = ["#0ea5e9", "#10b981", "#f59e0b", "#14b8a6", "#64748b", "#ef4444"];

export function ReferralSourceChart({ data }: { data: { source: string; count: number }[] }) {
  const chartData = data.map((d, i) => ({ ...d, fill: PALETTE[i % PALETTE.length] }));

  const chartConfig = Object.fromEntries(
    chartData.map((d) => [d.source, { label: d.source, color: d.fill }])
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-55">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel />} />
        <Pie data={chartData} dataKey="count" nameKey="source" innerRadius={50} outerRadius={80} strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent nameKey="source" />} />
      </PieChart>
    </ChartContainer>
  );
}
