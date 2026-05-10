import { Footprints, HeartPulse, Shield, Timer, BatteryCharging, RadioTower, Activity, Gauge } from "lucide-react";
import { ScoreGauge } from "../ScoreGauge";
import { MetricCard } from "../MetricCard";
import { GaitRadarChart } from "../GaitRadarChart";
import { LumbarStatusCard } from "../LumbarStatusCard";
import { DeviceStatusCard } from "../DeviceStatusCard";
import { formatDelta, riskMeta } from "../../lib/presentation";
import type { DemoSnapshot, UserProfile } from "../../types";

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string; }) {
  return (
    <div className="mb-6 border-b border-gold-600/20 pb-4">
      <p className="text-sm font-medium text-gold-500 uppercase tracking-widest">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-gold-400" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gold-200/60">{description}</p>
    </div>
  );
}

export function DataAnalysisView({ snapshot, profile }: { snapshot: DemoSnapshot; profile: UserProfile }) {
  const risk = riskMeta[snapshot.riskLevel];
  const abnormalCount = snapshot.events.filter((event) => event.level !== "green").length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Overview Section */}
      <section>
        <SectionHeader eyebrow="Dashboard" title="核心数据总览" description="今日守护状态压缩成家人一眼能看懂的指标。" />
        
        {/* Profile Card */}
        <div className="mb-6 rounded-xl bg-mist/60 border border-gold-600/30 p-4 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dark-bg border border-gold-500 text-xl font-semibold text-gold-400 shadow-gold">
              {profile.avatar}
            </div>
            <div>
              <p className="text-sm text-gold-500">被守护人</p>
              <p className="text-xl font-bold text-gold-200" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>
                {profile.relation} {profile.name}，{profile.age}岁
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <ScoreGauge score={snapshot.guardScore} level={snapshot.riskLevel} />
          
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="步态稳定性"
              value={snapshot.gaitFeatures.gaitScore}
              unit="分"
              detail={`较14天基线 ${formatDelta(snapshot.gaitFeatures.baselineDeviation)}`}
              icon={Footprints}
              tone={snapshot.gaitFeatures.gaitScore >= 80 ? "green" : "orange"}
            />
            <MetricCard
              title="腰部姿态"
              value={snapshot.lumbarFeatures.posture}
              detail="综合识别"
              icon={HeartPulse}
              tone={snapshot.lumbarFeatures.posture === "正常" ? "green" : "orange"}
            />
            <MetricCard
              title="护腰贴合度"
              value={snapshot.lumbarFeatures.fitScore}
              unit="分"
              detail={snapshot.deviceStatus.wearingStatus}
              icon={Shield}
              tone={snapshot.lumbarFeatures.fitScore >= 85 ? "green" : "yellow"}
            />
            <MetricCard
              title="今日异常"
              value={abnormalCount}
              unit="条"
              detail="黄色及以上风险"
              icon={Activity}
              tone={abnormalCount > 0 ? "orange" : "green"}
            />
          </div>
        </div>
      </section>

      {/* Lumbar & Radar Section */}
      <section className="grid lg:grid-cols-2 gap-8">
        <div>
          <SectionHeader eyebrow="Lumbar" title="腰部状态分析" description="展示护腰佩戴、TENG支撑差异与腰部负荷。" />
          <LumbarStatusCard lumbar={snapshot.lumbarFeatures} device={snapshot.deviceStatus} />
        </div>
        <div>
          <SectionHeader eyebrow="Gait Radar" title="多维步态雷达" description="全面展示步态各项维度的表现与短板。" />
          <div className="rounded-2xl border border-gold-600/20 bg-mist/40 p-4 h-[calc(100%-5rem)] shadow-soft flex items-center justify-center">
            <GaitRadarChart data={snapshot.radarData} />
          </div>
        </div>
      </section>

      {/* Device Status */}
      <section>
        <SectionHeader eyebrow="Device" title="设备与连接状态" description="智能硬件实时运行状况。" />
        <DeviceStatusCard device={snapshot.deviceStatus} />
      </section>
    </div>
  );
}
