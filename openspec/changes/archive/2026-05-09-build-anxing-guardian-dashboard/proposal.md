## Why

京彩大创路演需要一个可直接演示的中文 Web Demo，把“安行护腰”的 TENG 柔性自驱动传感单元与 IMU 惯性传感器能力转化为评委和消费者能理解的家庭照护看板。当前第一阶段不接入真实硬件，前端需要用本地 mock 数据呈现腰部状态、步态稳定性、设备状态和异常风险提示。

## What Changes

- 新建一个 Vite + React + TypeScript + Tailwind CSS 单页演示项目。
- 使用本地 mock 数据和模拟算法生成 IMU、TENG、步态、腰部、设备和风险事件数据。
- 实现「正常守护」「步态波动」「转身不稳」「疑似跌倒」四个演示场景切换，并联动全页面指标、图表、状态、事件和自然语言提示。
- 实现首页总览、实时监测、步态分析、腰部状态、异常预警、周报六类展示模块。
- 使用 Recharts 或 ECharts 绘制实时曲线、趋势图和雷达图，使用 lucide-react 提供轻量科技感图标。
- 页面文案全中文，并明确采用家庭照护辅助口径，避免医疗诊断、治疗、防止跌倒、精准预测等绝对化表达。
- 支持桌面端优先的响应式布局，并适配移动端浏览。

## Capabilities

### New Capabilities

- `guardian-dashboard-demo`: 覆盖安行护腰中文 Web Demo 的场景切换、mock 数据生成、指标计算、可视化模块、周报生成和谨慎风险提示表达。

### Modified Capabilities

- 无。

## Impact

- 新增前端项目文件：`package.json`、Vite/TypeScript/Tailwind 配置、`src/` 下应用代码、组件、类型、mock 数据与算法。
- 新增运行依赖：React、Vite、TypeScript、Tailwind CSS、Recharts 或 ECharts、lucide-react。
- 不新增后端、数据库或外部 API 调用；所有演示数据在浏览器端本地生成。
