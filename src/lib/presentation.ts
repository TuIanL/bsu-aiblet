import type { GuardStatus, RiskLevel } from "../types";

export const riskMeta: Record<
  RiskLevel,
  {
    label: string;
    status: GuardStatus;
    textClass: string;
    bgClass: string;
    borderClass: string;
    fill: string;
    stroke: string;
  }
> = {
  green: {
    label: "绿色安全",
    status: "安全",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    fill: "#16a163",
    stroke: "#0f8a55",
  },
  yellow: {
    label: "黄色关注",
    status: "关注",
    textClass: "text-amber-700",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    fill: "#d99b12",
    stroke: "#bd7e08",
  },
  orange: {
    label: "橙色警惕",
    status: "警惕",
    textClass: "text-orange-700",
    bgClass: "bg-orange-50",
    borderClass: "border-orange-200",
    fill: "#ef7d24",
    stroke: "#d45f12",
  },
  red: {
    label: "红色紧急",
    status: "紧急",
    textClass: "text-red-700",
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    fill: "#dd3b3b",
    stroke: "#c52b2b",
  },
};

export const formatDelta = (value: number, suffix = "分") => {
  if (value > 0) return `+${value}${suffix}`;
  if (value < 0) return `${value}${suffix}`;
  return `持平`;
};

export const getScoreTone = (score: number): RiskLevel => {
  if (score >= 85) return "green";
  if (score >= 70) return "yellow";
  if (score >= 50) return "orange";
  return "red";
};
