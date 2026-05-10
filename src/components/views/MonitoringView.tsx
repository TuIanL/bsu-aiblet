import { Activity, Footprints, Waves, RadioTower } from "lucide-react";
import { RealtimeSensorChart } from "../RealtimeSensorChart";
import { GaitTrendChart } from "../GaitTrendChart";
import { WeeklyReportCard } from "../WeeklyReportCard";
import { MetricCard } from "../MetricCard";
import { riskMeta } from "../../lib/presentation";
import type { DemoSnapshot } from "../../types";

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string; }) {
  return (
    <div className="mb-6 border-b border-gold-600/20 pb-4">
      <p className="text-sm font-medium text-gold-500 uppercase tracking-widest">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-gold-400" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gold-200/60">{description}</p>
    </div>
  );
}

export function MonitoringView({ snapshot }: { snapshot: DemoSnapshot }) {
  const risk = riskMeta[snapshot.riskLevel];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <section>
        <SectionHeader eyebrow="Realtime" title="实时传感监测" description="IMU与TENG的实时波形，同步当前活动状态。" />
        
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="当前活动"
            value={snapshot.activity}
            icon={Activity}
            tone={snapshot.activity === "疑似跌倒" ? "red" : "gold"}
          />
          <MetricCard
            title="当前步频"
            value={snapshot.gaitFeatures.cadence}
            unit="步/分"
            icon={Footprints}
            tone="green"
          />
          <MetricCard
            title="摆动指数"
            value={snapshot.gaitFeatures.swayIndex}
            icon={Waves}
            tone={snapshot.gaitFeatures.swayIndex > 35 ? "orange" : "cyan"}
          />
          <MetricCard
            title="同步时间"
            value={snapshot.deviceStatus.lastSyncTime}
            icon={RadioTower}
            tone="slate"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <RealtimeSensorChart
            title="IMU 三轴加速度"
            frames={snapshot.frames}
            unit="g"
            series={[
              { key: "ax", name: "ax", color: "#d48806" },
              { key: "ay", name: "ay", color: "#faad14" },
              { key: "az", name: "az", color: "#ffe58f" },
            ]}
          />
          <RealtimeSensorChart
            title="IMU 三轴角速度"
            frames={snapshot.frames}
            unit="deg/s"
            series={[
              { key: "gx", name: "gx", color: "#d48806" },
              { key: "gy", name: "gy", color: "#faad14" },
              { key: "gz", name: "gz", color: "#ffe58f" },
            ]}
          />
          <RealtimeSensorChart
            title="TENG 柔性传感信号"
            frames={snapshot.frames}
            unit="signal"
            kind="area"
            series={[
              { key: "tengLeft", name: "左侧", color: "#d48806" },
              { key: "tengRight", name: "右侧", color: "#faad14" },
              { key: "tengBack", name: "后腰", color: "#ffe58f" },
            ]}
          />
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Long-term" title="长期趋势与周报" description="基于多维数据的长期趋势分析与智能总结报告。" />
        
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="rounded-xl bg-mist/40 border border-gold-600/20 p-4 shadow-soft">
            <GaitTrendChart data={snapshot.trendData} />
          </div>
          <WeeklyReportCard
            summary={snapshot.weeklySummary}
            report={snapshot.weeklyReport}
          />
        </div>
      </section>
    </div>
  );
}
