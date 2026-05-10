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
    <div className="w-full h-full min-h-[300px]">
      <div className="mb-3">
        <h3 className="text-base font-bold text-gold-400">7 天步态趋势</h3>
        <p className="mt-1 text-sm text-gold-200/60">稳定性、步频与左右摆动同步观察</p>
      </div>
      <div className="h-64 sm:h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="rgba(212, 136, 6, 0.1)" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#d48806", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#d48806", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 110]}
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
            <Line
              type="monotone"
              dataKey="gaitScore"
              name="稳定性评分"
              stroke="#faad14"
              strokeWidth={3}
              dot={{ r: 3, fill: "#faad14", stroke: "#2a1f18" }}
            />
            <Line
              type="monotone"
              dataKey="cadence"
              name="步频"
              stroke="#ffe58f"
              strokeWidth={2}
              dot={{ r: 2, fill: "#ffe58f", stroke: "#2a1f18" }}
            />
            <Line
              type="monotone"
              dataKey="swayIndex"
              name="左右摆动"
              stroke="#ad6800"
              strokeWidth={2}
              dot={{ r: 2, fill: "#ad6800", stroke: "#2a1f18" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
