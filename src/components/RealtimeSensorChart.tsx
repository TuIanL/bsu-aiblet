import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  AreaChart,
  ComposedChart,
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
    <div className="rounded-lg border border-gold-600/30 bg-mist/50 p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-gold-400">{title}</h3>
        {unit ? <span className="text-xs text-gold-500/70">{unit}</span> : null}
      </div>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={frames} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="rgba(212, 136, 6, 0.1)" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: "#d48806", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "#d48806", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                backgroundColor: 'rgba(21, 16, 13, 0.9)',
                border: "1px solid rgba(212, 136, 6, 0.3)",
                boxShadow: "0 0 15px rgba(250, 173, 20, 0.2)",
                color: '#faad14'
              }}
              itemStyle={{ color: '#faad14' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#d48806' }} />
            {series.map((item) =>
              kind === "area" ? (
                <Area
                  key={String(item.key)}
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.4}
                  strokeWidth={3}
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
