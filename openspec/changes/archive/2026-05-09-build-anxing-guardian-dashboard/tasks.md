## 1. Project Setup

- [x] 1.1 Create Vite React TypeScript project files and npm scripts.
- [x] 1.2 Add Tailwind CSS, PostCSS, TypeScript, and Vite configuration.
- [x] 1.3 Add React, Recharts, lucide-react, and required development dependencies.
- [x] 1.4 Create base `src` structure, global styles, and application entrypoint.

## 2. Domain Data And Algorithms

- [x] 2.1 Define TypeScript domain types for profile, device, sensors, gait, lumbar, risks, scenarios, and reports.
- [x] 2.2 Create static user profile and scenario metadata in mock data files.
- [x] 2.3 Implement `generateMockSensorFrames(scenario)` with IMU and TENG waveform variations.
- [x] 2.4 Implement `detectActivity(frames)` and scenario-aware gait feature computation.
- [x] 2.5 Implement lumbar feature computation, guard score weighting, event generation, and weekly report generation.
- [x] 2.6 Create derived chart datasets for 7-day trends and radar dimensions.

## 3. Layout And Shared Components

- [x] 3.1 Build `AppShell` with responsive page frame, slogan, profile summary, and section layout.
- [x] 3.2 Build `ScenarioSwitcher` with four demo scenarios and active-state styling.
- [x] 3.3 Build reusable cards including `StatusCard`, `ScoreGauge`, `MetricCard`, and `DeviceStatusCard`.
- [x] 3.4 Add risk-level color utilities and consistent Chinese status labels.

## 4. Dashboard And Realtime Monitoring

- [x] 4.1 Implement dashboard overview metrics, current status, abnormal event count, and natural-language prompt.
- [x] 4.2 Implement `RealtimeSensorChart` for IMU acceleration, IMU angular velocity, and TENG signal curves.
- [x] 4.3 Display current activity, cadence, sway index, realtime risk level, and sync time.
- [x] 4.4 Ensure scenario changes update all dashboard and realtime monitoring values.

## 5. Gait And Lumbar Modules

- [x] 5.1 Implement gait metric grid with baseline comparison values.
- [x] 5.2 Implement `GaitTrendChart` for 7-day gait score, cadence, and sway trends.
- [x] 5.3 Implement `GaitRadarChart` with rhythm, stability, symmetry, turning, sit-to-stand, and lumbar control dimensions.
- [x] 5.4 Implement `LumbarStatusCard` with brace fit, support, posture, load, movement counts, and waist illustration.
- [x] 5.5 Ensure degraded scenarios visibly affect gait and lumbar charts or metrics.

## 6. Alerts, Report, And Copy Safety

- [x] 6.1 Implement `AlertTimeline` with event time, risk color, description, evidence, and handling status.
- [x] 6.2 Implement `WeeklyReportCard` with natural Chinese care summary and family suggestions.
- [x] 6.3 Review all visible copy to avoid medical diagnosis, treatment, absolute prevention, or precise prediction claims.
- [x] 6.4 Verify suspected fall scenario shows red emergency state and a “疑似跌倒事件”.

## 7. Verification

- [x] 7.1 Run TypeScript build or Vite build to verify the project compiles.
- [x] 7.2 Run the development server and verify the page loads locally.
- [x] 7.3 Check desktop and mobile responsive layouts for readable cards, charts, and text.
- [x] 7.4 Validate all four scenario switches update scores, charts, events, and report content consistently.
