"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  count: { label: "عدد الزيارات", color: "#0ea5e9" },
} satisfies ChartConfig;

export function TopProceduresChart({ data }: { data: { procedure: string; count: number }[] }) {
  const height = Math.max(55 * 4, data.length * 40);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} />
        <YAxis dataKey="procedure" type="category" tickLine={false} axisLine={false} width={140} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
