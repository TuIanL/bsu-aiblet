## Context

当前仓库尚无前端应用代码，需要从零创建一个面向路演的中文 Web Demo。Demo 的核心价值不是医疗判断，而是把智能护腰采集到的 TENG 与 IMU 信号用消费者能理解的方式呈现为家庭照护辅助信息：步态稳定性、腰部状态、佩戴贴合、设备状态和异常风险提示。

项目第一阶段没有真实硬件、后端或数据库，因此所有数据都在浏览器端生成。页面需要同时服务两类观众：消费者要感到温暖可信，评委要能看出传感器、算法和产品闭环。

## Goals / Non-Goals

**Goals:**

- 创建可通过 `npm install` 和 `npm run dev` 启动的 Vite + React + TypeScript 项目。
- 使用 Tailwind CSS、图表库和 lucide-react 实现中文、响应式、适合路演展示的单页看板。
- 实现场景切换，使「正常守护」「步态波动」「转身不稳」「疑似跌倒」四类演示状态影响所有关键指标和图表。
- 用 mock algorithm 文件集中表达传感器数据生成、活动识别、步态特征、腰部特征、守护指数、风险事件和周报生成逻辑。
- 在文案上坚持家庭照护辅助定位，使用“风险提示、辅助识别、疑似跌倒、建议观察”等谨慎表达。

**Non-Goals:**

- 不接入真实硬件、蓝牙、后端服务、数据库或外部 API。
- 不提供医疗诊断、治疗建议、跌倒防止承诺或精准预测能力。
- 不实现登录、家庭成员管理、通知推送、数据持久化或多页面路由。
- 不追求生产级传感器算法精度；本阶段算法服务于可信演示和产品叙事。

## Decisions

### 1. Single-page dashboard with section modules

使用一个 React 单页应用承载全部模块：总览、实时监测、步态分析、腰部状态、异常预警、周报。顶部提供被守护人摘要、slogan 和演示场景切换。

Alternatives considered:

- 多页面路由：更像完整产品，但增加样板代码和演示跳转成本。
- 单页长看板：更适合路演，评委可以连续扫读完整故事线。

Decision: 采用单页长看板，并通过卡片、分区标题和图表建立层次。

### 2. Scenario-first mock data generation

定义统一的 `ScenarioKey`，所有数据从当前场景推导：sensor frames、device status、gait features、lumbar features、risk events、guard score、weekly report、dashboard prompt。

Alternatives considered:

- 直接写静态数据：实现最快，但缺少“传感器到指标”的可信链路。
- 使用定时器不断随机刷新：动态感强，但路演时数值抖动会影响讲解。

Decision: 生成稳定但带波形变化的 mock 数据。切换场景时整体重算，图表表现足够真实且可控。

### 3. Typed domain model

在 `src/types.ts` 中定义 UserProfile、DeviceStatus、SensorFrame、GaitFeatures、LumbarFeatures、RiskEvent 等类型，并补充场景、风险等级、活动状态、姿态状态等枚举联合类型。

Alternatives considered:

- 直接在组件内使用对象字面量：短期简单，但跨模块数据容易漂移。

Decision: 使用集中类型定义，让算法和组件共享同一套语义。

### 4. Recharts for visualization

使用 Recharts 实现实时线图、7 天趋势图和雷达图。它与 React 集成轻量，足够覆盖本 Demo 所需图表。

Alternatives considered:

- ECharts：能力更强，但配置较重。
- 手写 SVG/canvas：可控性高，但会增加图表基础设施成本。

Decision: 使用 Recharts，减少集成复杂度，把时间用于产品表达和响应式细节。

### 5. Warm technology visual language

主视觉使用绿色、蓝色、白色和柔和浅背景，预警使用黄、橙、红。整体是智能穿戴产品官网与应用控制台之间的感觉：有卡片和指标，但避免冰冷后台表格感。

Alternatives considered:

- 医疗系统风格：可信但容易误导产品定位。
- 纯消费品官网风格：温暖但可能弱化数据可信度。

Decision: 使用“温暖家庭守护 + 适度科技看板”的混合风格。

## Risks / Trade-offs

- [Risk] 模拟算法被误解为真实诊断能力 → Mitigation: 文案显式采用“辅助识别”“风险提示”“疑似跌倒”“建议观察”，避免医疗化表达。
- [Risk] 页面模块多导致信息密度过高 → Mitigation: 顶部总览突出核心分数，详细图表下沉到分区卡片，移动端改为单列。
- [Risk] mock 数据之间不一致削弱可信度 → Mitigation: 所有指标由同一场景和算法模块推导，风险等级、事件、图表趋势保持一致。
- [Risk] 图表在小屏拥挤 → Mitigation: 卡片使用响应式栅格，图表容器设置固定高度和 `ResponsiveContainer`。
- [Risk] 没有真实硬件时演示显得静态 → Mitigation: 传感器曲线生成连续波形，设备同步时间、活动状态和场景事件共同构成实时感。

## Migration Plan

这是从零创建的前端 Demo，无数据迁移需求。实现步骤为：创建项目配置，安装依赖，补齐类型与算法，搭建页面组件，接入场景联动，运行构建或开发服务器验证。若需要回退，可删除新增前端文件和本 change。

## Open Questions

- 是否需要在最终路演版本加入团队 logo、学校/项目标识或演示二维码。
- 是否需要额外提供大屏展示模式，例如隐藏浏览器外壳后更适合投影的 16:9 布局。
