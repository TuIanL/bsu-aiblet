import { CheckCircle2, Clock3 } from "lucide-react";
import { riskMeta } from "../lib/presentation";
import type { RiskEvent } from "../types";

interface AlertTimelineProps {
  events: RiskEvent[];
}

export function AlertTimeline({ events }: AlertTimelineProps) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/95 p-5 shadow-card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">异常预警时间轴</h3>
          <p className="mt-1 text-sm text-slate-500">家庭守护事件与处理状态</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
          今日 {events.length} 条
        </span>
      </div>
      <div className="space-y-4">
        {events.map((event) => {
          const meta = riskMeta[event.level];
          return (
            <div key={event.id} className="grid gap-3 sm:grid-cols-[5rem_1fr]">
              <div className="flex items-start gap-2 text-sm font-medium text-slate-600">
                <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                {event.time}
              </div>
              <div className={`rounded-lg border p-4 ${meta.bgClass} ${meta.borderClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full bg-white/80 px-2.5 py-1 text-xs ${meta.textClass}`}>
                        {event.type}
                      </span>
                      <span className={`text-sm font-medium ${meta.textClass}`}>{meta.label}</span>
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-ink">{event.title}</h4>
                  </div>
                  <span className="flex w-fit items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {event.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{event.description}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">判断依据：{event.evidence}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
