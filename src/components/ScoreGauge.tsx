import { riskMeta } from "../lib/presentation";
import type { RiskLevel } from "../types";

interface ScoreGaugeProps {
  score: number;
  level: RiskLevel;
  label?: string;
}

export function ScoreGauge({ score, level, label = "安行守护指数" }: ScoreGaugeProps) {
  const circumference = 2 * Math.PI * 48;
  const offset = circumference * (1 - score / 100);
  const meta = riskMeta[level];

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-white/80 bg-white/95 p-5 shadow-card">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" role="img">
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="#e2edf0"
            strokeWidth="12"
          />
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke={meta.fill}
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold text-ink">{score}</span>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-1 text-lg font-semibold ${meta.textClass}`}>{meta.status}</p>
      </div>
    </div>
  );
}
