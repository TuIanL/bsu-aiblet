import { Activity } from "lucide-react";
import { scenarios } from "../data/mockData";
import type { ScenarioKey } from "../types";

interface ScenarioSwitcherProps {
  value: ScenarioKey;
  onChange: (scenario: ScenarioKey) => void;
}

export function ScenarioSwitcher({ value, onChange }: ScenarioSwitcherProps) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/85 p-3 shadow-soft backdrop-blur">
      <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-slate-600">
        <Activity className="h-4 w-4 text-guard-blue" aria-hidden="true" />
        演示场景
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scenarios.map((scenario) => {
          const active = value === scenario.key;
          return (
            <button
              key={scenario.key}
              type="button"
              onClick={() => onChange(scenario.key)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                active
                  ? "border-guard-blue bg-blue-50 text-guard-blue shadow-soft"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60"
              }`}
              title={scenario.description}
            >
              <span className="block text-sm font-semibold">{scenario.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{scenario.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
