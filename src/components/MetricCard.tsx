import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: ReactNode;
  unit?: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: "green" | "blue" | "cyan" | "yellow" | "orange" | "red" | "slate" | "gold";
}

const toneClasses = {
  green: "bg-gold-900/40 text-gold-400 border-gold-600/30",
  blue: "bg-gold-800/40 text-gold-300 border-gold-500/30",
  cyan: "bg-gold-700/40 text-gold-200 border-gold-400/30",
  yellow: "bg-gold-600/40 text-gold-100 border-gold-300/30",
  orange: "bg-orange-900/40 text-orange-400 border-orange-600/30",
  red: "bg-red-900/40 text-red-400 border-red-600/30",
  slate: "bg-mist/60 text-gold-200/50 border-gold-600/20",
  gold: "bg-gold-gradient text-mist border-gold-400 shadow-gold",
};

export function MetricCard({
  title,
  value,
  unit,
  detail,
  icon: Icon,
  tone = "gold",
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gold-600/30 bg-mist/50 p-4 shadow-soft hover:border-gold-500/50 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gold-500">{title}</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-2xl font-bold tracking-normal text-gold-200">{value}</span>
            {unit ? <span className="pb-1 text-sm text-gold-200/60">{unit}</span> : null}
          </div>
        </div>
        {Icon ? (
          <div className={`rounded-lg border p-2 transition-all ${toneClasses[tone]} group-hover:shadow-gold`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm leading-5 text-gold-100/50">{detail}</p> : null}
    </div>
  );
}
