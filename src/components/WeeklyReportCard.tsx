import { ClipboardCheck, Moon, Shield, Timer } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { WeeklySummary } from "../types";

interface WeeklyReportCardProps {
  summary: WeeklySummary;
  report: string;
}

export function WeeklyReportCard({ summary, report }: WeeklyReportCardProps) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/95 p-5 shadow-card">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-ink">本周家庭照护报告</h3>
        <p className="mt-1 text-sm text-slate-500">由本地模拟数据生成，用于路演展示</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          title="平均守护指数"
          value={summary.averageGuardScore}
          unit="分"
          icon={Shield}
          tone={summary.averageGuardScore >= 80 ? "green" : "orange"}
        />
        <MetricCard
          title="平均每日佩戴"
          value={summary.averageDailyWearingHours}
          unit="小时"
          icon={Timer}
          tone="blue"
        />
        <MetricCard
          title="疑似跌倒事件"
          value={summary.suspectedFallCount}
          unit="次"
          icon={ClipboardCheck}
          tone={summary.suspectedFallCount > 0 ? "red" : "green"}
        />
        <MetricCard
          title="夜间活动变化"
          value={summary.nighttimeActivityChange}
          icon={Moon}
          tone="cyan"
        />
      </div>
      <div className="mt-5 rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 p-5">
        <p className="text-base leading-8 text-slate-700">{report}</p>
      </div>
    </div>
  );
}
