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

  // Override light themes with dark gold theme equivalents
  const isNormal = level === "green";
  const bgClass = isNormal ? "bg-mist/40" : "bg-red-900/40";
  const borderClass = isNormal ? "border-gold-600/30" : "border-red-600/30";
  const textClass = isNormal ? "text-gold-400" : "text-red-400";
  const titleClass = isNormal ? "text-gold-300" : "text-red-300";

  return (
    <div
      className={`rounded-lg border p-5 shadow-soft ${bgClass} ${borderClass}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-dark-bg/80 border border-gold-600/20 p-3 shadow-gold">
            <ShieldCheck className={`h-6 w-6 ${textClass}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-gold-500">当前状态</p>
            <h2 className={`text-3xl font-bold ${titleClass}`} style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>{status}</h2>
          </div>
        </div>
        <span className={`w-fit rounded-full bg-dark-bg/80 border border-gold-600/30 px-3 py-1 text-sm ${textClass}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-4 text-base leading-7 text-gold-100/80">{prompt}</p>
    </div>
  );
}
