import { Activity } from "lucide-react";
import { scenarios } from "../data/mockData";
import type { ScenarioKey } from "../types";

interface ScenarioSwitcherProps {
  value: ScenarioKey;
  onChange: (scenario: ScenarioKey) => void;
}

export function ScenarioSwitcher({ value, onChange }: ScenarioSwitcherProps) {
  return (
    <div className="rounded-lg border border-gold-600/30 bg-mist/80 p-3 shadow-soft backdrop-blur">
      <div className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-gold-400">
        <Activity className="h-4 w-4 text-gold-500" aria-hidden="true" />
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
                  ? "border-gold-400 bg-gold-900/60 text-gold-200 shadow-gold"
                  : "border-gold-600/20 bg-dark-bg text-gold-200/60 hover:border-gold-500/50 hover:bg-gold-900/30 hover:text-gold-100"
              }`}
              title={scenario.description}
            >
              <span className="block text-sm font-bold">{scenario.label}</span>
              <span className="mt-1 block text-xs text-gold-200/40">{scenario.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
