import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { userProfile } from "./data/mockData";
import {
  computeDemoSnapshot,
  generateMockSensorFrames,
} from "./lib/algorithms";
import type { ScenarioKey } from "./types";

export type TabKey = "product" | "analysis" | "monitor" | "interaction";

function App() {
  const [scenario, setScenario] = useState<ScenarioKey>("normal");
  const [activeTab, setActiveTab] = useState<TabKey>("analysis");

  const frames = useMemo(() => generateMockSensorFrames(scenario), [scenario]);
  const snapshot = useMemo(
    () => computeDemoSnapshot(userProfile, frames, scenario),
    [frames, scenario],
  );

  return (
    <AppShell
      profile={userProfile}
      scenario={scenario}
      snapshot={snapshot}
      onScenarioChange={setScenario}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}

export default App;
