import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RadarPoint } from "../types";

interface GaitRadarChartProps {
  data: RadarPoint[];
}

export function GaitRadarChart({ data }: GaitRadarChartProps) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-soft">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-ink">今日步态雷达</h3>
        <p className="mt-1 text-sm text-slate-500">节律、对称性与腰部控制综合视图</p>
      </div>
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#dbe8ec" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#334155", fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #dbe8ec",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              }}
            />
            <Radar
              name="能力评分"
              dataKey="value"
              stroke="#1f7ae0"
              fill="#1f7ae0"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
