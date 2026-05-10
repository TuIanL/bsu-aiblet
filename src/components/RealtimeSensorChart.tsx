import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SensorFrame } from "../types";

interface RealtimeSensorChartProps {
  title: string;
  frames: SensorFrame[];
  series: Array<{
    key: keyof SensorFrame;
    name: string;
    color: string;
  }>;
  kind?: "line" | "area";
  unit?: string;
}

export function RealtimeSensorChart({
  title,
  frames,
  series,
  kind = "line",
  unit,
}: RealtimeSensorChartProps) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {unit ? <span className="text-xs text-slate-500">{unit}</span> : null}
      </div>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={frames} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="#e8f0f2" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #dbe8ec",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {series.map((item) =>
              kind === "area" ? (
                <Area
                  key={String(item.key)}
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                  type="monotone"
                />
              ) : (
                <Line
                  key={String(item.key)}
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={false}
                  type="monotone"
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
