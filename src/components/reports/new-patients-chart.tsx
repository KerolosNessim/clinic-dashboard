"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  count: { label: "مرضى جدد", color: "#14b8a6" },
} satisfies ChartConfig;

export function NewPatientsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-55 w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillNewPatients" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="count"
          type="monotone"
          stroke="var(--color-count)"
          strokeWidth={2}
          fill="url(#fillNewPatients)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
