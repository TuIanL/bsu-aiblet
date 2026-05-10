import { ShieldCheck } from "lucide-react";
import { riskMeta } from "../lib/presentation";
import type { GuardStatus, RiskLevel } from "../types";

interface StatusCardProps {
  status: GuardStatus;
  level: RiskLevel;
  prompt: string;
}

export function StatusCard({ status, level, prompt }: StatusCardProps) {
  const meta = riskMeta[level];

  return (
    <div
      className={`rounded-lg border p-5 shadow-soft ${meta.bgClass} ${meta.borderClass}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-3">
            <ShieldCheck className={`h-6 w-6 ${meta.textClass}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-slate-600">当前状态</p>
            <h2 className={`text-3xl font-semibold ${meta.textClass}`}>{status}</h2>
          </div>
        </div>
        <span className={`w-fit rounded-full bg-white/80 px-3 py-1 text-sm ${meta.textClass}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-4 text-base leading-7 text-slate-700">{prompt}</p>
    </div>
  );
}
