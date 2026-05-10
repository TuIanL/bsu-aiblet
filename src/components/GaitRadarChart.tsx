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
    <div className="w-full h-full min-h-[300px]">
      <div className="mb-3">
        <h3 className="text-base font-bold text-gold-400">今日步态雷达</h3>
        <p className="mt-1 text-sm text-gold-200/60">节律、对称性与腰部控制综合视图</p>
      </div>
      <div className="h-64 sm:h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="rgba(212, 136, 6, 0.2)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#d48806", fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "rgba(212, 136, 6, 0.5)", fontSize: 10 }}
              tickCount={5}
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
            <Radar
              name="能力评分"
              dataKey="value"
              stroke="#faad14"
              fill="#d48806"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
