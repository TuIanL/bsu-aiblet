import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: ReactNode;
  unit?: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: "green" | "blue" | "cyan" | "yellow" | "orange" | "red" | "slate";
}

const toneClasses = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
  yellow: "bg-amber-50 text-amber-700 border-amber-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  red: "bg-red-50 text-red-700 border-red-100",
  slate: "bg-slate-50 text-slate-700 border-slate-100",
};

export function MetricCard({
  title,
  value,
  unit,
  detail,
  icon: Icon,
  tone = "blue",
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/92 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-2xl font-semibold tracking-normal text-ink">{value}</span>
            {unit ? <span className="pb-1 text-sm text-slate-500">{unit}</span> : null}
          </div>
        </div>
        {Icon ? (
          <div className={`rounded-lg border p-2 ${toneClasses[tone]}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm leading-5 text-slate-500">{detail}</p> : null}
    </div>
  );
}
