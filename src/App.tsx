import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { userProfile } from "./data/mockData";
import {
  computeDemoSnapshot,
  generateMockSensorFrames,
} from "./lib/algorithms";
import type { ScenarioKey } from "./types";

function App() {
  const [scenario, setScenario] = useState<ScenarioKey>("normal");

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
    />
  );
}

export default App;
