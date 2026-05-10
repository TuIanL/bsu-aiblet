import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../types";

interface GaitTrendChartProps {
  data: TrendPoint[];
}

export function GaitTrendChart({ data }: GaitTrendChartProps) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-soft">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-ink">7 天步态趋势</h3>
        <p className="mt-1 text-sm text-slate-500">稳定性、步频与左右摆动同步观察</p>
      </div>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#e8f0f2" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 110]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #dbe8ec",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="gaitScore"
              name="稳定性评分"
              stroke="#16a163"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="cadence"
              name="步频"
              stroke="#1f7ae0"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="swayIndex"
              name="左右摆动"
              stroke="#ef7d24"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
