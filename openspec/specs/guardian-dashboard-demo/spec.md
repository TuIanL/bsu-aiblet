# guardian-dashboard-demo Specification

## Purpose
Defines the local Chinese web demo for “安行护腰 · 家庭步态守护看板”, including mock sensor data, scenario-driven dashboard behavior, family care wording, visual modules, and responsive presentation requirements.

## Requirements
### Requirement: Runnable frontend demo project

The system SHALL provide a complete Vite, React, TypeScript, and Tailwind CSS web demo that can run locally without a backend, database, hardware device, or external API.

#### Scenario: Start local development server

- **WHEN** a developer runs `npm install` followed by `npm run dev`
- **THEN** the application starts as a local web demo with no required backend service

#### Scenario: Use local mock data only

- **WHEN** the demo renders charts, metrics, reports, device status, or alert events
- **THEN** the data comes from local TypeScript mock data and algorithm functions

### Requirement: Chinese home care positioning

The system SHALL present all user-facing copy in Chinese and SHALL frame the product as a family care assistance system rather than a medical diagnosis or treatment system.

#### Scenario: Avoid medicalized claims

- **WHEN** the dashboard, alert events, and weekly report display risk-related text
- **THEN** the wording uses cautious expressions such as “风险提示”, “辅助识别”, “疑似跌倒”, “建议观察”, and “家庭守护”

#### Scenario: Avoid absolute prevention or prediction claims

- **WHEN** the application describes abnormal events or gait risk
- **THEN** it does not claim to diagnose disease, provide treatment, prevent falls, or precisely predict falls

### Requirement: Scenario switching controls

The system SHALL provide a visible “演示场景” switching control with four scenarios: “正常守护”, “步态波动”, “转身不稳”, and “疑似跌倒”.

#### Scenario: Switch to normal guarding

- **WHEN** the user selects “正常守护”
- **THEN** the top status is safe or green, the guard score is high, the event timeline contains no suspected fall event, and the system prompt describes an overall stable state

#### Scenario: Switch to gait fluctuation

- **WHEN** the user selects “步态波动”
- **THEN** gait stability decreases, yellow attention-level reminders appear, and gait trend or baseline comparison values reflect a mild decline

#### Scenario: Switch to unstable turning

- **WHEN** the user selects “转身不稳”
- **THEN** turn stability decreases, orange warning-level event content appears, and related gait radar or metric values reflect turning instability

#### Scenario: Switch to suspected fall

- **WHEN** the user selects “疑似跌倒”
- **THEN** the top status becomes red emergency, the guard score decreases substantially, and the alert timeline includes a “疑似跌倒事件”

### Requirement: Dashboard overview

The system SHALL display a dashboard overview containing guarded person information, current status, guard score, gait stability, lumbar posture, brace fit, today wearing duration, battery, connection status, abnormal event count, and a natural-language system prompt.

#### Scenario: View guarded person summary

- **WHEN** the dashboard loads
- **THEN** it shows a profile such as “母亲 王女士，72岁” and the slogan “让远方的牵挂，看得见父母每一步。”

#### Scenario: View synchronized overview metrics

- **WHEN** the active scenario changes
- **THEN** the current status, score, metrics, abnormal event count, and prompt update consistently with that scenario

### Requirement: Realtime monitoring module

The system SHALL display realtime monitoring information including activity status, IMU acceleration curves, IMU angular velocity curves, TENG left/right/back signal curves, cadence, sway index, realtime risk level, and device sync time.

#### Scenario: View sensor curves

- **WHEN** the realtime module renders
- **THEN** it shows three-axis IMU acceleration, three-axis IMU angular velocity, and three-channel TENG signal charts

#### Scenario: View activity recognition output

- **WHEN** mock sensor frames are generated for the current scenario
- **THEN** the module displays one of the supported activity states: 静坐, 站立, 行走, 转身, 起身, 弯腰, or 疑似跌倒

### Requirement: Gait analysis module

The system SHALL display gait analysis metrics including gait score, average cadence, step interval coefficient of variation, rhythm regularity, sway index, turn stability, sit-to-stand stability, estimated speed, and 14-day baseline comparison.

#### Scenario: View gait charts

- **WHEN** the gait analysis module renders
- **THEN** it shows 7-day gait stability trend, 7-day cadence trend, 7-day sway trend, and a radar chart with rhythm, stability, symmetry, turning, sit-to-stand, and lumbar control dimensions

#### Scenario: Reflect baseline change

- **WHEN** the active scenario has degraded gait behavior
- **THEN** the baseline comparison indicates the relevant decrease or fluctuation compared with the personal 14-day baseline

### Requirement: Lumbar status module

The system SHALL display lumbar status information including wearing status, fit score, TENG left-right support difference, back support index, forward bend count, twist count, sedentary alerts, lumbar load index, and posture state.

#### Scenario: View lumbar illustration

- **WHEN** the lumbar status module renders
- **THEN** it includes a simplified human or waist illustration card that visually reflects the current lumbar posture state

#### Scenario: Reflect brace looseness

- **WHEN** the active scenario includes poor fit or brace looseness
- **THEN** the fit score, support difference, and related alert content reflect lower support quality

### Requirement: Risk alert timeline

The system SHALL display an alert timeline containing care events with time, risk level color, event description, evidence, and handling status.

#### Scenario: View event details

- **WHEN** the alert timeline renders
- **THEN** each event includes its time, risk level, title or description, judgment evidence, and status such as 已提醒, 已确认安全, or 等待确认

#### Scenario: Include supported event types

- **WHEN** events are generated across demo scenarios
- **THEN** the system can represent 久坐提醒, 步态波动提醒, 护腰松动提醒, 夜间活动提醒, and 疑似跌倒事件

### Requirement: Weekly care report

The system SHALL generate a natural-language Chinese weekly care report from summary data, including average guard score, average daily wearing duration, gait stability change, suspected fall count, nighttime activity change, sedentary reminder count, and family care suggestions.

#### Scenario: Generate readable report

- **WHEN** the weekly report card renders
- **THEN** the report reads like a real product-generated care summary rather than a mechanical list of fields

#### Scenario: Match active scenario

- **WHEN** the active scenario changes
- **THEN** the weekly report tone and recommendations update consistently with the scenario risk level

### Requirement: Mock algorithm module

The system SHALL implement `src/lib/algorithms.ts` with functions for generating sensor frames, detecting activity, computing gait features, computing lumbar features, computing guard score, generating risk events, and generating weekly report text.

#### Scenario: Generate sensor frames by scenario

- **WHEN** `generateMockSensorFrames(scenario)` is called
- **THEN** it returns IMU and TENG waveform data whose magnitude and pattern reflect the selected scenario

#### Scenario: Compute guard score

- **WHEN** `computeGuardScore(gaitFeatures, lumbarFeatures, events, deviceStatus)` is called
- **THEN** it calculates a 0-100 score using gait stability, lumbar posture and support, event safety, and wearing/device status as weighted inputs

### Requirement: Responsive visual design

The system SHALL use a warm, trustworthy, technology-oriented visual style with green, blue, and white as primary colors and yellow, orange, and red for risk levels.

#### Scenario: Desktop layout

- **WHEN** the demo is viewed on a desktop viewport
- **THEN** the page uses a clear card-based grid with large key metrics and readable charts

#### Scenario: Mobile layout

- **WHEN** the demo is viewed on a mobile viewport
- **THEN** modules reflow into a single-column or compact layout without overlapping text or unreadable charts
