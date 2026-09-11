"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AppointmentStatus } from "@/generated/prisma/client";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  CONFIRMED: "#0ea5e9",
  ATTENDED: "#10b981",
  NO_SHOW: "#f59e0b",
  CANCELLED: "#ef4444",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMED: "مؤكد",
  ATTENDED: "حضر",
  NO_SHOW: "لم يحضر",
  CANCELLED: "ملغي",
};

const chartConfig = {
  count: { label: "عدد المواعيد" },
} satisfies ChartConfig;

export function AppointmentStatusChart({
  data,
}: {
  data: { status: AppointmentStatus; count: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: STATUS_LABEL[d.status],
    fill: STATUS_COLOR[d.status],
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-55 w-full">
      <BarChart data={chartData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
          <LabelList
            dataKey="count"
            position="top"
            className="fill-foreground text-xs font-medium"
          />
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
