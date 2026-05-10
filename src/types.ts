export type ScenarioKey = "normal" | "gaitWave" | "turnUnstable" | "suspectedFall";

export type RiskLevel = "green" | "yellow" | "orange" | "red";

export type GuardStatus = "安全" | "关注" | "警惕" | "紧急";

export type ActivityStatus =
  | "静坐"
  | "站立"
  | "行走"
  | "转身"
  | "起身"
  | "弯腰"
  | "疑似跌倒";

export type LumbarPosture = "正常" | "前屈" | "后仰" | "侧倾" | "扭转";

export type WearingStatus = "佩戴良好" | "轻微松动" | "需要调整" | "未佩戴";

export type ConnectionStatus = "已连接" | "同步中" | "连接不稳" | "离线";

export type RiskEventType =
  | "久坐提醒"
  | "步态波动提醒"
  | "护腰松动提醒"
  | "夜间活动提醒"
  | "疑似跌倒事件";

export type EventStatus = "已提醒" | "已确认安全" | "等待确认";

export interface UserProfile {
  id: string;
  name: string;
  relation: string;
  age: number;
  avatar: string;
  baselineGaitScore: number;
  baselineCadence: number;
  baselineSwayIndex: number;
}

export interface DeviceStatus {
  battery: number;
  connectionStatus: ConnectionStatus;
  wearingStatus: WearingStatus;
  lastSyncTime: string;
  tengSignalQuality: number;
  imuSignalQuality: number;
}

export interface SensorFrame {
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  tengLeft: number;
  tengRight: number;
  tengBack: number;
}

export interface GaitFeatures {
  cadence: number;
  stepIntervalCV: number;
  gaitRegularity: number;
  estimatedSpeed: number;
  swayIndex: number;
  symmetryIndex: number;
  turnStability: number;
  sitToStandStability: number;
  gaitScore: number;
  baselineDeviation: number;
}

export interface LumbarFeatures {
  posture: LumbarPosture;
  fitScore: number;
  leftRightPressureDiff: number;
  backSupportIndex: number;
  forwardBendCount: number;
  twistCount: number;
  sedentaryAlerts: number;
  lumbarLoadIndex: number;
}

export interface RiskEvent {
  id: string;
  time: string;
  type: RiskEventType;
  level: RiskLevel;
  title: string;
  description: string;
  evidence: string;
  status: EventStatus;
}

export interface ScenarioMeta {
  key: ScenarioKey;
  label: string;
  shortLabel: string;
  description: string;
}

export interface TrendPoint {
  day: string;
  gaitScore: number;
  cadence: number;
  swayIndex: number;
}

export interface RadarPoint {
  metric: string;
  value: number;
}

export interface WeeklySummary {
  averageGuardScore: number;
  averageDailyWearingHours: number;
  gaitStabilityChange: number;
  suspectedFallCount: number;
  nighttimeActivityChange: string;
  sedentaryAlertCount: number;
  suggestion: string;
}

export interface DemoSnapshot {
  frames: SensorFrame[];
  deviceStatus: DeviceStatus;
  activity: ActivityStatus;
  gaitFeatures: GaitFeatures;
  lumbarFeatures: LumbarFeatures;
  guardScore: number;
  guardStatus: GuardStatus;
  riskLevel: RiskLevel;
  dashboardPrompt: string;
  events: RiskEvent[];
  trendData: TrendPoint[];
  radarData: RadarPoint[];
  weeklySummary: WeeklySummary;
  weeklyReport: string;
  todayWearingHours: number;
}
