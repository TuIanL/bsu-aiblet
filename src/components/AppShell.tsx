import {
  Activity,
  BatteryCharging,
  Footprints,
  Gauge,
  HeartPulse,
  RadioTower,
  Shield,
  Sparkles,
  Timer,
  UserRound,
  Waves,
} from "lucide-react";
import { AlertTimeline } from "./AlertTimeline";
import { DeviceStatusCard } from "./DeviceStatusCard";
import { GaitRadarChart } from "./GaitRadarChart";
import { GaitTrendChart } from "./GaitTrendChart";
import { LumbarStatusCard } from "./LumbarStatusCard";
import { MetricCard } from "./MetricCard";
import { RealtimeSensorChart } from "./RealtimeSensorChart";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { ScoreGauge } from "./ScoreGauge";
import { StatusCard } from "./StatusCard";
import { WeeklyReportCard } from "./WeeklyReportCard";
import { formatDelta, riskMeta } from "../lib/presentation";
import type { DemoSnapshot, ScenarioKey, UserProfile } from "../types";

interface AppShellProps {
  profile: UserProfile;
  scenario: ScenarioKey;
  snapshot: DemoSnapshot;
  onScenarioChange: (scenario: ScenarioKey) => void;
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-guard-blue">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function AppShell({
  profile,
  scenario,
  snapshot,
  onScenarioChange,
}: AppShellProps) {
  const risk = riskMeta[snapshot.riskLevel];
  const abnormalCount = snapshot.events.filter((event) => event.level !== "green").length;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-lg border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur">
          <div className="grid gap-5 xl:grid-cols-[1fr_34rem] xl:items-end">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  TENG + IMU 家庭照护辅助演示
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                  本地模拟数据
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
                安行护腰 · 家庭步态守护看板
              </h1>
              <p className="mt-3 text-xl font-medium text-slate-700">
                让远方的牵挂，看得见父母每一步。
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                面向家庭照护场景的智能护腰演示系统，通过本地模拟传感信号展示腰部状态、步态稳定性和风险提示。
              </p>
            </div>

            <ScenarioSwitcher value={scenario} onChange={onScenarioChange} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
            <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-semibold text-guard-blue shadow-soft">
                  {profile.avatar}
                </div>
                <div>
                  <p className="text-sm text-slate-500">被守护人</p>
                  <p className="text-lg font-semibold text-ink">
                    {profile.relation} {profile.name}，{profile.age}岁
                  </p>
                </div>
              </div>
            </div>
            <StatusCard
              status={snapshot.guardStatus}
              level={snapshot.riskLevel}
              prompt={snapshot.dashboardPrompt}
            />
          </div>
        </header>

        <section className="mb-8">
          <SectionHeader
            eyebrow="Dashboard"
            title="首页总览"
            description="把今日守护状态压缩成家人一眼能看懂的指标，同时保留评委关心的设备和传感器信息。"
          />
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <ScoreGauge score={snapshot.guardScore} level={snapshot.riskLevel} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="步态稳定性评分"
                value={snapshot.gaitFeatures.gaitScore}
                unit="分"
                detail={`较 14 天基线 ${formatDelta(snapshot.gaitFeatures.baselineDeviation)}`}
                icon={Footprints}
                tone={snapshot.gaitFeatures.gaitScore >= 80 ? "green" : "orange"}
              />
              <MetricCard
                title="腰部姿态状态"
                value={snapshot.lumbarFeatures.posture}
                detail="IMU 姿态与 TENG 支撑综合识别"
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
                title="今日佩戴时长"
                value={snapshot.todayWearingHours}
                unit="小时"
                detail="家庭守护建议佩戴区间"
                icon={Timer}
                tone="blue"
              />
              <MetricCard
                title="设备电量"
                value={snapshot.deviceStatus.battery}
                unit="%"
                detail="支持当天持续演示"
                icon={BatteryCharging}
                tone={snapshot.deviceStatus.battery > 75 ? "green" : "yellow"}
              />
              <MetricCard
                title="设备连接状态"
                value={snapshot.deviceStatus.connectionStatus}
                detail={`最近同步 ${snapshot.deviceStatus.lastSyncTime}`}
                icon={RadioTower}
                tone="cyan"
              />
              <MetricCard
                title="今日异常事件"
                value={abnormalCount}
                unit="条"
                detail="黄色及以上风险提示"
                icon={Activity}
                tone={abnormalCount > 0 ? "orange" : "green"}
              />
              <MetricCard
                title="实时风险等级"
                value={risk.status}
                detail={risk.label}
                icon={Gauge}
                tone={
                  snapshot.riskLevel === "red"
                    ? "red"
                    : snapshot.riskLevel === "orange"
                      ? "orange"
                      : snapshot.riskLevel === "yellow"
                        ? "yellow"
                        : "green"
                }
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <SectionHeader
            eyebrow="Realtime"
            title="实时监测"
            description="用模拟传感器帧展示 IMU 与 TENG 的实时波形，并同步当前活动状态、步频和风险等级。"
          />
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="当前活动状态"
              value={snapshot.activity}
              detail="由模拟 IMU 波形辅助识别"
              icon={Activity}
              tone={snapshot.activity === "疑似跌倒" ? "red" : "blue"}
            />
            <MetricCard
              title="当前步频"
              value={snapshot.gaitFeatures.cadence}
              unit="步/分钟"
              detail="基于步态节律估计"
              icon={Footprints}
              tone="green"
            />
            <MetricCard
              title="腰部左右摆动指数"
              value={snapshot.gaitFeatures.swayIndex}
              unit="分"
              detail="数值升高代表摆动更明显"
              icon={Waves}
              tone={snapshot.gaitFeatures.swayIndex > 35 ? "orange" : "cyan"}
            />
            <MetricCard
              title="设备同步时间"
              value={snapshot.deviceStatus.lastSyncTime}
              detail={risk.label}
              icon={RadioTower}
              tone="slate"
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <RealtimeSensorChart
              title="IMU 三轴加速度"
              frames={snapshot.frames}
              unit="g"
              series={[
                { key: "ax", name: "ax", color: "#16a163" },
                { key: "ay", name: "ay", color: "#1f7ae0" },
                { key: "az", name: "az", color: "#ef7d24" },
              ]}
            />
            <RealtimeSensorChart
              title="IMU 三轴角速度"
              frames={snapshot.frames}
              unit="deg/s"
              series={[
                { key: "gx", name: "gx", color: "#11a7b7" },
                { key: "gy", name: "gy", color: "#d99b12" },
                { key: "gz", name: "gz", color: "#dd3b3b" },
              ]}
            />
            <RealtimeSensorChart
              title="TENG 柔性传感信号"
              frames={snapshot.frames}
              unit="signal"
              kind="area"
              series={[
                { key: "tengLeft", name: "左侧", color: "#16a163" },
                { key: "tengRight", name: "右侧", color: "#1f7ae0" },
                { key: "tengBack", name: "后腰", color: "#11a7b7" },
              ]}
            />
          </div>
        </section>

        <section className="mb-8">
          <SectionHeader
            eyebrow="Gait"
            title="步态分析"
            description="结合 14 天个人基线、7 天趋势和今日雷达图，解释步态节律与稳定性变化。"
          />
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="平均步频" value={snapshot.gaitFeatures.cadence} unit="步/分钟" tone="blue" />
            <MetricCard title="步间隔变异系数" value={snapshot.gaitFeatures.stepIntervalCV} unit="%" tone="yellow" />
            <MetricCard title="步态节律稳定性" value={snapshot.gaitFeatures.gaitRegularity} unit="分" tone="green" />
            <MetricCard title="转身稳定性" value={snapshot.gaitFeatures.turnStability} unit="分" tone={snapshot.gaitFeatures.turnStability < 70 ? "orange" : "green"} />
            <MetricCard title="起身稳定性" value={snapshot.gaitFeatures.sitToStandStability} unit="分" tone="cyan" />
            <MetricCard title="估计步速" value={snapshot.gaitFeatures.estimatedSpeed} unit="m/s" tone="blue" />
            <MetricCard title="左右摆动指数" value={snapshot.gaitFeatures.swayIndex} unit="分" tone={snapshot.gaitFeatures.swayIndex > 35 ? "orange" : "green"} />
            <MetricCard
              title="基线变化"
              value={formatDelta(snapshot.gaitFeatures.baselineDeviation)}
              detail="与个人 14 天基线相比"
              tone={snapshot.gaitFeatures.baselineDeviation < -15 ? "orange" : snapshot.gaitFeatures.baselineDeviation < 0 ? "yellow" : "green"}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <GaitTrendChart data={snapshot.trendData} />
            <GaitRadarChart data={snapshot.radarData} />
          </div>
        </section>

        <section className="mb-8">
          <SectionHeader
            eyebrow="Lumbar"
            title="腰部状态"
            description="展示护腰佩戴、TENG 支撑差异、姿态变化和腰部负荷，让硬件能力更直观。"
          />
          <LumbarStatusCard lumbar={snapshot.lumbarFeatures} device={snapshot.deviceStatus} />
        </section>

        <section className="mb-8">
          <SectionHeader
            eyebrow="Device"
            title="设备与连接"
            description="展示电量、连接、佩戴和信号质量，让演示具备真实智能穿戴产品的状态反馈。"
          />
          <DeviceStatusCard device={snapshot.deviceStatus} />
        </section>

        <section className="mb-8">
          <SectionHeader
            eyebrow="Alerts"
            title="异常预警"
            description="以家庭照护口径呈现风险提示、判断依据和处理状态，帮助家人快速理解发生了什么。"
          />
          <AlertTimeline events={snapshot.events} />
        </section>

        <section className="pb-10">
          <SectionHeader
            eyebrow="Weekly Report"
            title="周报模块"
            description="把一周内的佩戴、步态、夜间活动和提醒汇总成接近日常产品体验的中文照护报告。"
          />
          <WeeklyReportCard
            summary={snapshot.weeklySummary}
            report={snapshot.weeklyReport}
          />
        </section>
      </div>
    </main>
  );
}
