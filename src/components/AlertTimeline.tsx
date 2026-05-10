import { CheckCircle2, Clock3 } from "lucide-react";
import { riskMeta } from "../lib/presentation";
import type { RiskEvent } from "../types";

interface AlertTimelineProps {
  events: RiskEvent[];
}

export function AlertTimeline({ events }: AlertTimelineProps) {
  return (
    <div className="rounded-lg border border-gold-600/30 bg-mist/50 p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gold-400">异常预警时间轴</h3>
          <p className="mt-1 text-sm text-gold-200/60">家庭守护事件与处理状态</p>
        </div>
        <span className="rounded-full bg-gold-gradient text-mist px-3 py-1 text-sm font-bold shadow-gold">
          今日 {events.length} 条
        </span>
      </div>
      <div className="space-y-4">
        {events.map((event) => {
          const meta = riskMeta[event.level];
          // Override light theme
          const isNormal = event.level === "green";
          const bgClass = isNormal ? "bg-mist/40" : (event.level === "red" ? "bg-red-900/40" : "bg-orange-900/40");
          const borderClass = isNormal ? "border-gold-600/30" : (event.level === "red" ? "border-red-600/30" : "border-orange-600/30");
          const textClass = isNormal ? "text-gold-400" : (event.level === "red" ? "text-red-400" : "text-orange-400");
          
          return (
            <div key={event.id} className="grid gap-3 sm:grid-cols-[5rem_1fr]">
              <div className="flex items-start gap-2 text-sm font-medium text-gold-500">
                <Clock3 className="mt-0.5 h-4 w-4 text-gold-600" aria-hidden="true" />
                {event.time}
              </div>
              <div className={`rounded-lg border p-4 ${bgClass} ${borderClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full bg-dark-bg/80 px-2.5 py-1 text-xs border border-gold-600/20 ${textClass}`}>
                        {event.type}
                      </span>
                      <span className={`text-sm font-bold ${textClass}`}>{meta.label}</span>
                    </div>
                    <h4 className="mt-2 text-base font-bold text-gold-200">{event.title}</h4>
                  </div>
                  <span className="flex w-fit items-center gap-1 rounded-full bg-dark-bg/80 border border-gold-600/20 px-3 py-1 text-sm text-gold-300">
                    <CheckCircle2 className="h-4 w-4 text-gold-500" aria-hidden="true" />
                    {event.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gold-100/80">{event.description}</p>
                <p className="mt-2 text-sm leading-6 text-gold-500/70">判断依据：{event.evidence}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
