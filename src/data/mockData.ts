import type { ScenarioKey, ScenarioMeta, UserProfile } from "../types";

export const userProfile: UserProfile = {
  id: "guardian-wang-72",
  name: "王女士",
  relation: "母亲",
  age: 72,
  avatar: "王",
  baselineGaitScore: 88,
  baselineCadence: 96,
  baselineSwayIndex: 18,
};

export const scenarios: ScenarioMeta[] = [
  {
    key: "normal",
    label: "正常守护",
    shortLabel: "正常",
    description: "整体活动平稳，适合展示日常家庭守护状态。",
  },
  {
    key: "gaitWave",
    label: "步态波动",
    shortLabel: "波动",
    description: "步态节律较基线有轻微波动，触发关注提示。",
  },
  {
    key: "turnUnstable",
    label: "转身不稳",
    shortLabel: "转身",
    description: "转身阶段左右摆动增加，触发橙色预警。",
  },
  {
    key: "suspectedFall",
    label: "疑似跌倒",
    shortLabel: "跌倒",
    description: "出现短时冲击和姿态异常，进入紧急确认流程。",
  },
];

export const scenarioOrder: ScenarioKey[] = [
  "normal",
  "gaitWave",
  "turnUnstable",
  "suspectedFall",
];

export const getScenarioLabel = (scenario: ScenarioKey) =>
  scenarios.find((item) => item.key === scenario)?.label ?? "正常守护";
