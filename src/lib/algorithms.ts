import type {
  ActivityStatus,
  DemoSnapshot,
  DeviceStatus,
  GaitFeatures,
  GuardStatus,
  LumbarFeatures,
  RadarPoint,
  RiskEvent,
  RiskLevel,
  ScenarioKey,
  SensorFrame,
  TrendPoint,
  UserProfile,
  WeeklySummary,
} from "../types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const nowTime = () =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

const scenarioRisk: Record<ScenarioKey, RiskLevel> = {
  normal: "green",
  gaitWave: "yellow",
  turnUnstable: "orange",
  suspectedFall: "red",
};

const scenarioStatus: Record<RiskLevel, GuardStatus> = {
  green: "安全",
  yellow: "关注",
  orange: "警惕",
  red: "紧急",
};

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return "green";
  if (score >= 70) return "yellow";
  if (score >= 50) return "orange";
  return "red";
}

export function getGuardStatus(score: number): GuardStatus {
  return scenarioStatus[getRiskLevel(score)];
}

export function generateMockSensorFrames(scenario: ScenarioKey): SensorFrame[] {
  const count = 72;
  const settings = {
    normal: { amp: 0.22, sway: 0.09, gyro: 12, teng: 0.82, noise: 0.015 },
    gaitWave: { amp: 0.36, sway: 0.2, gyro: 18, teng: 0.76, noise: 0.035 },
    turnUnstable: { amp: 0.42, sway: 0.34, gyro: 34, teng: 0.7, noise: 0.04 },
    suspectedFall: { amp: 0.5, sway: 0.44, gyro: 42, teng: 0.58, noise: 0.06 },
  }[scenario];

  return Array.from({ length: count }, (_, index) => {
    const t = index / 6;
    const wave = Math.sin(t * 2.4);
    const halfWave = Math.sin(t * 1.2 + 0.7);
    const noise = Math.sin(index * 1.71) * settings.noise;
    const fallPulse =
      scenario === "suspectedFall" && index > 42 && index < 50
        ? Math.sin((index - 42) / 7 * Math.PI) * 1.65
        : 0;
    const turnPulse =
      scenario === "turnUnstable" && index > 30 && index < 48
        ? Math.sin((index - 30) / 18 * Math.PI) * 0.55
        : 0;

    // 演示算法用连续波形模拟 IMU 与 TENG：场景越异常，摆动、角速度和左右压力差越大。
    const ax = settings.amp * wave + turnPulse * 0.3 + fallPulse * 0.8 + noise;
    const ay = settings.sway * Math.sin(t * 1.9 + 0.6) + turnPulse + fallPulse * 0.28;
    const az = 0.96 + settings.amp * 0.25 * halfWave - fallPulse * 0.38;
    const gx = settings.gyro * Math.sin(t * 1.7 + 0.4) + fallPulse * 70;
    const gy = settings.gyro * 0.75 * Math.cos(t * 1.4) + turnPulse * 42;
    const gz = settings.gyro * 0.6 * Math.sin(t * 2.1) + fallPulse * 52;

    const pressureGap =
      scenario === "turnUnstable" ? 0.18 : scenario === "suspectedFall" ? 0.24 : 0.06;
    const tengBase = settings.teng + 0.08 * wave;
    const tengLeft = clamp((tengBase + pressureGap * Math.sin(t * 1.5)) * 100, 0, 100);
    const tengRight = clamp((tengBase - pressureGap * Math.sin(t * 1.5 + 0.3)) * 100, 0, 100);
    const tengBack = clamp((settings.teng + 0.07 * halfWave - fallPulse * 0.18) * 100, 0, 100);

    return {
      timestamp: index,
      ax: round(ax, 3),
      ay: round(ay, 3),
      az: round(az, 3),
      gx: round(gx, 2),
      gy: round(gy, 2),
      gz: round(gz, 2),
      tengLeft: round(tengLeft, 1),
      tengRight: round(tengRight, 1),
      tengBack: round(tengBack, 1),
    };
  });
}

export function detectActivity(frames: SensorFrame[]): ActivityStatus {
  const maxAccel = Math.max(...frames.map((frame) => Math.abs(frame.ax) + Math.abs(frame.ay)));
  const maxGyro = Math.max(...frames.map((frame) => Math.abs(frame.gx) + Math.abs(frame.gy)));
  const avgGyro = frames.reduce((sum, frame) => sum + Math.abs(frame.gy), 0) / frames.length;

  if (maxAccel > 1.65 || maxGyro > 115) return "疑似跌倒";
  if (avgGyro > 31) return "转身";
  if (maxAccel > 0.58) return "行走";
  if (avgGyro > 18) return "起身";
  return "站立";
}

export function computeGaitFeatures(
  frames: SensorFrame[],
  scenario: ScenarioKey,
  profile?: UserProfile,
): GaitFeatures {
  const avgSway =
    frames.reduce((sum, frame) => sum + Math.abs(frame.ay), 0) / frames.length;
  const avgGyro =
    frames.reduce((sum, frame) => sum + Math.abs(frame.gy), 0) / frames.length;

  const scenarioValues: Record<ScenarioKey, GaitFeatures> = {
    normal: {
      cadence: 96,
      stepIntervalCV: 4.8,
      gaitRegularity: 91,
      estimatedSpeed: 0.86,
      swayIndex: 17,
      symmetryIndex: 90,
      turnStability: 88,
      sitToStandStability: 86,
      gaitScore: 90,
      baselineDeviation: 2,
    },
    gaitWave: {
      cadence: 88,
      stepIntervalCV: 9.6,
      gaitRegularity: 76,
      estimatedSpeed: 0.72,
      swayIndex: 28,
      symmetryIndex: 78,
      turnStability: 79,
      sitToStandStability: 80,
      gaitScore: 76,
      baselineDeviation: -12,
    },
    turnUnstable: {
      cadence: 91,
      stepIntervalCV: 8.2,
      gaitRegularity: 79,
      estimatedSpeed: 0.75,
      swayIndex: 35,
      symmetryIndex: 72,
      turnStability: 58,
      sitToStandStability: 77,
      gaitScore: 64,
      baselineDeviation: -24,
    },
    suspectedFall: {
      cadence: 54,
      stepIntervalCV: 16.5,
      gaitRegularity: 48,
      estimatedSpeed: 0.38,
      swayIndex: 52,
      symmetryIndex: 46,
      turnStability: 35,
      sitToStandStability: 42,
      gaitScore: 38,
      baselineDeviation: -50,
    },
  };

  const base = scenarioValues[scenario];
  const gaitScore = clamp(base.gaitScore - avgSway * 3 + (profile?.baselineGaitScore ?? 88) * 0.02);

  return {
    ...base,
    gaitScore: round(gaitScore),
    cadence: round(base.cadence + Math.min(2, avgGyro / 20)),
    swayIndex: round(base.swayIndex + Math.min(3, avgSway * 2)),
  };
}

export function computeLumbarFeatures(
  frames: SensorFrame[],
  scenario: ScenarioKey,
): LumbarFeatures {
  const pressureDiff =
    frames.reduce((sum, frame) => sum + Math.abs(frame.tengLeft - frame.tengRight), 0) /
    frames.length;
  const backSupport =
    frames.reduce((sum, frame) => sum + frame.tengBack, 0) / frames.length;

  const base: Record<ScenarioKey, LumbarFeatures> = {
    normal: {
      posture: "正常",
      fitScore: 92,
      leftRightPressureDiff: 6,
      backSupportIndex: 88,
      forwardBendCount: 7,
      twistCount: 5,
      sedentaryAlerts: 1,
      lumbarLoadIndex: 24,
    },
    gaitWave: {
      posture: "侧倾",
      fitScore: 84,
      leftRightPressureDiff: 13,
      backSupportIndex: 81,
      forwardBendCount: 9,
      twistCount: 8,
      sedentaryAlerts: 2,
      lumbarLoadIndex: 36,
    },
    turnUnstable: {
      posture: "扭转",
      fitScore: 76,
      leftRightPressureDiff: 24,
      backSupportIndex: 74,
      forwardBendCount: 11,
      twistCount: 14,
      sedentaryAlerts: 2,
      lumbarLoadIndex: 49,
    },
    suspectedFall: {
      posture: "侧倾",
      fitScore: 62,
      leftRightPressureDiff: 31,
      backSupportIndex: 58,
      forwardBendCount: 12,
      twistCount: 17,
      sedentaryAlerts: 3,
      lumbarLoadIndex: 72,
    },
  };

  const selected = base[scenario];
  return {
    ...selected,
    leftRightPressureDiff: round(Math.max(selected.leftRightPressureDiff, pressureDiff)),
    backSupportIndex: round((selected.backSupportIndex + backSupport) / 2),
  };
}

export function generateDeviceStatus(scenario: ScenarioKey): DeviceStatus {
  const device: Record<ScenarioKey, DeviceStatus> = {
    normal: {
      battery: 86,
      connectionStatus: "已连接",
      wearingStatus: "佩戴良好",
      lastSyncTime: nowTime(),
      tengSignalQuality: 94,
      imuSignalQuality: 96,
    },
    gaitWave: {
      battery: 78,
      connectionStatus: "已连接",
      wearingStatus: "佩戴良好",
      lastSyncTime: nowTime(),
      tengSignalQuality: 88,
      imuSignalQuality: 91,
    },
    turnUnstable: {
      battery: 73,
      connectionStatus: "同步中",
      wearingStatus: "轻微松动",
      lastSyncTime: nowTime(),
      tengSignalQuality: 82,
      imuSignalQuality: 88,
    },
    suspectedFall: {
      battery: 69,
      connectionStatus: "已连接",
      wearingStatus: "需要调整",
      lastSyncTime: nowTime(),
      tengSignalQuality: 72,
      imuSignalQuality: 84,
    },
  };

  return device[scenario];
}

export function generateRiskEvents(scenario: ScenarioKey): RiskEvent[] {
  const normalEvents: RiskEvent[] = [
    {
      id: "sedentary-0918",
      time: "09:18",
      type: "久坐提醒",
      level: "green",
      title: "上午久坐提醒已处理",
      description: "连续静坐时间较长，系统已提示轻度活动。",
      evidence: "腰部姿态稳定，IMU 活动幅度低于日常活动阈值约 48 分钟。",
      status: "已确认安全",
    },
    {
      id: "night-0412",
      time: "04:12",
      type: "夜间活动提醒",
      level: "green",
      title: "夜间短时起身",
      description: "夜间出现一次短时活动，持续时间较短。",
      evidence: "加速度波形平缓，护腰贴合状态正常。",
      status: "已确认安全",
    },
  ];

  if (scenario === "normal") return normalEvents;

  if (scenario === "gaitWave") {
    return [
      {
        id: "gait-1026",
        time: "10:26",
        type: "步态波动提醒",
        level: "yellow",
        title: "步态节律轻度波动",
        description: "今日步态节律较个人基线略有下降，建议家人继续观察。",
        evidence: "步间隔变异系数升至 9.6%，步态稳定性较 14 天基线下降约 12 分。",
        status: "已提醒",
      },
      ...normalEvents,
    ];
  }

  if (scenario === "turnUnstable") {
    return [
      {
        id: "turn-1537",
        time: "15:37",
        type: "步态波动提醒",
        level: "orange",
        title: "转身阶段稳定性下降",
        description: "检测到转身时左右摆动增加，建议家人电话确认活动状态。",
        evidence: "角速度峰值高于日常转身基线，左右 TENG 支撑差异扩大。",
        status: "等待确认",
      },
      {
        id: "fit-1422",
        time: "14:22",
        type: "护腰松动提醒",
        level: "yellow",
        title: "护腰贴合度下降",
        description: "护腰左右支撑略不均衡，建议下次佩戴时重新调整位置。",
        evidence: "左右压力差持续高于 20%，后腰支撑指数低于平日均值。",
        status: "已提醒",
      },
      ...normalEvents.slice(0, 1),
    ];
  }

  return [
    {
      id: "fall-1848",
      time: "18:48",
      type: "疑似跌倒事件",
      level: "red",
      title: "疑似跌倒事件等待确认",
      description: "检测到短时冲击与姿态异常组合，已进入家庭确认流程。",
      evidence: "IMU 加速度出现短时峰值，随后腰部姿态保持侧倾，TENG 后腰支撑明显下降。",
      status: "等待确认",
    },
    {
      id: "fit-1849",
      time: "18:49",
      type: "护腰松动提醒",
      level: "orange",
      title: "事件后护腰贴合异常",
      description: "事件后护腰贴合度下降，建议确认佩戴状态与本人情况。",
      evidence: "左右支撑差异升高，后腰支撑指数低于当前安全参考区间。",
      status: "等待确认",
    },
    {
      id: "night-0310",
      time: "03:10",
      type: "夜间活动提醒",
      level: "yellow",
      title: "夜间活动次数增加",
      description: "昨夜活动次数较平日略有增加，建议结合生活作息继续观察。",
      evidence: "夜间起身片段 3 次，单次持续时间均较短。",
      status: "已提醒",
    },
  ];
}

export function computeGuardScore(
  gaitFeatures: GaitFeatures,
  lumbarFeatures: LumbarFeatures,
  events: RiskEvent[],
  deviceStatus: DeviceStatus,
): number {
  const eventPenalty = events.reduce((penalty, event) => {
    const value = { green: 0, yellow: 6, orange: 15, red: 36 }[event.level];
    return penalty + value;
  }, 0);
  const eventScore = clamp(100 - eventPenalty);
  const lumbarScore = clamp(
    lumbarFeatures.fitScore * 0.42 +
      lumbarFeatures.backSupportIndex * 0.32 +
      (100 - lumbarFeatures.leftRightPressureDiff) * 0.16 +
      (100 - lumbarFeatures.lumbarLoadIndex) * 0.1,
  );
  const deviceScore = clamp(
    deviceStatus.battery * 0.35 +
      deviceStatus.tengSignalQuality * 0.25 +
      deviceStatus.imuSignalQuality * 0.25 +
      (deviceStatus.connectionStatus === "离线" ? 30 : 92) * 0.15,
  );

  // 守护指数权重：步态稳定性 40%，腰部姿态与支撑 25%，异常事件安全 20%，佩戴与设备状态 15%。
  const score =
    gaitFeatures.gaitScore * 0.4 +
    lumbarScore * 0.25 +
    eventScore * 0.2 +
    deviceScore * 0.15;

  return round(clamp(score));
}

export function generateTrendData(
  scenario: ScenarioKey,
  profile: UserProfile,
): TrendPoint[] {
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "今日"];
  const drift: Record<ScenarioKey, number[]> = {
    normal: [-1, 1, 0, 2, 1, 0, 3],
    gaitWave: [0, -2, -1, -4, -7, -9, -12],
    turnUnstable: [1, -1, -3, -5, -10, -17, -24],
    suspectedFall: [-2, -3, -6, -8, -13, -22, -48],
  };
  const cadenceDrift: Record<ScenarioKey, number[]> = {
    normal: [0, 1, -1, 1, 0, 2, 1],
    gaitWave: [0, -1, -3, -5, -6, -7, -8],
    turnUnstable: [1, 0, -2, -4, -4, -6, -5],
    suspectedFall: [0, -4, -7, -9, -16, -25, -42],
  };
  const swayDrift: Record<ScenarioKey, number[]> = {
    normal: [0, -1, 1, 0, -1, 1, -1],
    gaitWave: [1, 2, 4, 6, 8, 9, 11],
    turnUnstable: [2, 4, 7, 9, 12, 15, 18],
    suspectedFall: [3, 5, 8, 11, 16, 24, 34],
  };

  return days.map((day, index) => ({
    day,
    gaitScore: clamp(profile.baselineGaitScore + drift[scenario][index], 0, 100),
    cadence: clamp(profile.baselineCadence + cadenceDrift[scenario][index], 35, 120),
    swayIndex: clamp(profile.baselineSwayIndex + swayDrift[scenario][index], 0, 70),
  }));
}

export function generateRadarData(
  gaitFeatures: GaitFeatures,
  lumbarFeatures: LumbarFeatures,
): RadarPoint[] {
  return [
    { metric: "节律", value: gaitFeatures.gaitRegularity },
    { metric: "稳定性", value: gaitFeatures.gaitScore },
    { metric: "对称性", value: gaitFeatures.symmetryIndex },
    { metric: "转身", value: gaitFeatures.turnStability },
    { metric: "起身", value: gaitFeatures.sitToStandStability },
    { metric: "腰部控制", value: clamp(100 - lumbarFeatures.lumbarLoadIndex) },
  ];
}

export function generateWeeklySummary(
  scenario: ScenarioKey,
  guardScore: number,
  lumbarFeatures: LumbarFeatures,
): WeeklySummary {
  const base: Record<ScenarioKey, Omit<WeeklySummary, "averageGuardScore" | "sedentaryAlertCount">> = {
    normal: {
      averageDailyWearingHours: 8.4,
      gaitStabilityChange: 2,
      suspectedFallCount: 0,
      nighttimeActivityChange: "与上周基本持平",
      suggestion: "建议继续保持当前佩戴节奏，晚间起身后留意地面照明和活动路径。",
    },
    gaitWave: {
      averageDailyWearingHours: 7.8,
      gaitStabilityChange: -9,
      suspectedFallCount: 0,
      nighttimeActivityChange: "较上周略有增加",
      suggestion: "建议家人在晚间或外出前多一次问候，观察近期睡眠、疲劳和活动安排变化。",
    },
    turnUnstable: {
      averageDailyWearingHours: 7.1,
      gaitStabilityChange: -17,
      suspectedFallCount: 0,
      nighttimeActivityChange: "较上周略有增加",
      suggestion: "建议关注转身、起身等动作场景，必要时协助调整护腰贴合位置。",
    },
    suspectedFall: {
      averageDailyWearingHours: 6.6,
      gaitStabilityChange: -31,
      suspectedFallCount: 1,
      nighttimeActivityChange: "较上周明显增加",
      suggestion: "建议尽快通过电话或现场方式确认本人状态，并复核护腰佩戴与居家活动环境。",
    },
  };

  return {
    ...base[scenario],
    averageGuardScore: Math.max(35, Math.round((guardScore + 3) * 0.92)),
    sedentaryAlertCount: lumbarFeatures.sedentaryAlerts + (scenario === "normal" ? 2 : 5),
  };
}

export function generateWeeklyReport(summary: WeeklySummary): string {
  const trendText =
    summary.gaitStabilityChange >= 0
      ? `步态稳定性较个人 14 天基线提升约 ${summary.gaitStabilityChange} 分`
      : `步态稳定性较个人 14 天基线下降约 ${Math.abs(summary.gaitStabilityChange)} 分`;

  return `本周平均安行守护指数为 ${summary.averageGuardScore} 分，平均每日佩戴时长约 ${summary.averageDailyWearingHours} 小时。${trendText}，疑似跌倒事件记录 ${summary.suspectedFallCount} 次，夜间活动${summary.nighttimeActivityChange}。系统共发出 ${summary.sedentaryAlertCount} 次久坐提醒，整体建议是：${summary.suggestion}`;
}

export function createDashboardPrompt(
  scenario: ScenarioKey,
  guardScore: number,
): string {
  const prompts: Record<ScenarioKey, string> = {
    normal: "今日整体状态平稳，未发现疑似跌倒事件。晚间活动量较昨日略有下降，建议继续观察。",
    gaitWave: "今日步态节律有轻度波动，整体仍处于可关注范围。建议家人晚间问候一次，了解是否疲劳或活动较多。",
    turnUnstable: "今日转身阶段左右摆动增加，系统已发出风险提示。建议确认护腰贴合状态，并留意起身、转身场景。",
    suspectedFall: "系统识别到一次疑似跌倒事件，当前等待家人确认安全。建议尽快联系本人或现场查看情况。",
  };

  return `${prompts[scenario]} 当前安行守护指数 ${guardScore} 分。`;
}

export function computeDemoSnapshot(
  profile: UserProfile,
  frames: SensorFrame[],
  scenario: ScenarioKey,
): DemoSnapshot {
  const deviceStatus = generateDeviceStatus(scenario);
  const activity = detectActivity(frames);
  const gaitFeatures = computeGaitFeatures(frames, scenario, profile);
  const lumbarFeatures = computeLumbarFeatures(frames, scenario);
  const events = generateRiskEvents(scenario);
  const computedScore = computeGuardScore(gaitFeatures, lumbarFeatures, events, deviceStatus);
  const scenarioScoreCap: Record<ScenarioKey, number> = {
    normal: 94,
    gaitWave: 82,
    turnUnstable: 68,
    suspectedFall: 48,
  };
  const guardScore = Math.min(computedScore, scenarioScoreCap[scenario]);
  const riskLevel =
    scenario === "suspectedFall" ? "red" : scenarioRisk[scenario] ?? getRiskLevel(guardScore);
  const trendData = generateTrendData(scenario, profile);
  const radarData = generateRadarData(gaitFeatures, lumbarFeatures);
  const weeklySummary = generateWeeklySummary(scenario, guardScore, lumbarFeatures);

  return {
    frames,
    deviceStatus,
    activity: scenario === "suspectedFall" ? "疑似跌倒" : activity,
    gaitFeatures,
    lumbarFeatures,
    guardScore,
    guardStatus: scenarioStatus[riskLevel],
    riskLevel,
    dashboardPrompt: createDashboardPrompt(scenario, guardScore),
    events,
    trendData,
    radarData,
    weeklySummary,
    weeklyReport: generateWeeklyReport(weeklySummary),
    todayWearingHours: weeklySummary.averageDailyWearingHours,
  };
}
