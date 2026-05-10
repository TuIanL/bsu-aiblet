import { Activity, RotateCcw, TimerReset } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { DeviceStatus, LumbarFeatures } from "../types";

interface LumbarStatusCardProps {
  lumbar: LumbarFeatures;
  device: DeviceStatus;
}

const postureRotation = {
  正常: "rotate-0",
  前屈: "rotate-3",
  后仰: "-rotate-3",
  侧倾: "rotate-6",
  扭转: "-rotate-6",
};

export function LumbarStatusCard({ lumbar, device }: LumbarStatusCardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
      <div className="rounded-lg border border-gold-600/30 bg-mist/50 p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gold-400">腰部状态示意</h3>
            <p className="mt-1 text-sm text-gold-200/60">当前姿态：{lumbar.posture}</p>
          </div>
          <span className="rounded-full bg-gold-900/40 border border-gold-600/30 px-3 py-1 text-sm text-gold-400">
            {device.wearingStatus}
          </span>
        </div>
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg bg-dark-bg/80 border border-gold-600/20 shadow-inner">
          <div className={`relative transition-transform duration-300 ${postureRotation[lumbar.posture]}`}>
            <div className="mx-auto h-12 w-12 rounded-full bg-gold-900/50 border border-gold-600/30 shadow-gold" />
            <div className="mx-auto mt-2 h-24 w-16 rounded-[28px] bg-gold-800/40 border border-gold-600/20" />
            <div className="absolute left-1/2 top-[98px] h-14 w-32 -translate-x-1/2 rounded-lg border-2 border-gold-400 bg-gold-900/60 shadow-gold">
              <div
                className="h-full rounded bg-gold-gradient opacity-80"
                style={{ width: `${lumbar.fitScore}%` }}
              />
            </div>
            <div className="mx-auto mt-2 h-16 w-20 rounded-b-full bg-gold-900/50 border border-gold-600/30 shadow-gold" />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-gold-200/50">
          示意图用于展示护腰贴合和腰部姿态变化，当前不作为医疗判断依据。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          title="护腰贴合度"
          value={lumbar.fitScore}
          unit="分"
          detail="TENG 信号综合估计"
          icon={Activity}
          tone={lumbar.fitScore >= 85 ? "green" : "orange"}
        />
        <MetricCard
          title="左右支撑差异"
          value={lumbar.leftRightPressureDiff}
          unit="%"
          detail="数值越高代表两侧支撑越不均衡"
          icon={RotateCcw}
          tone={lumbar.leftRightPressureDiff > 20 ? "orange" : "blue"}
        />
        <MetricCard
          title="后腰支撑压力指数"
          value={lumbar.backSupportIndex}
          unit="分"
          detail="后腰区域 TENG 支撑强度"
          tone="cyan"
        />
        <MetricCard
          title="腰部负荷指数"
          value={lumbar.lumbarLoadIndex}
          unit="分"
          detail="结合姿态、扭转与支撑变化"
          tone={lumbar.lumbarLoadIndex > 60 ? "red" : "yellow"}
        />
        <MetricCard
          title="腰部前屈次数"
          value={lumbar.forwardBendCount}
          unit="次"
          detail="今日累计"
          tone="slate"
        />
        <MetricCard
          title="腰部扭转次数"
          value={lumbar.twistCount}
          unit="次"
          detail="今日累计"
          tone="slate"
        />
        <MetricCard
          title="久坐提醒次数"
          value={lumbar.sedentaryAlerts}
          unit="次"
          detail="已按家庭守护策略提示"
          icon={TimerReset}
          tone="yellow"
        />
        <MetricCard
          title="腰部姿态"
          value={lumbar.posture}
          detail="基于 IMU 姿态与 TENG 支撑变化"
          tone={lumbar.posture === "正常" ? "green" : "orange"}
        />
      </div>
    </div>
  );
}
