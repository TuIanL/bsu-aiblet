import {
  Activity,
  BatteryCharging,
  Footprints,
  Gauge,
  HeartPulse,
  RadioTower,
  Shield,
  Sparkles,
  Timer,
  UserRound,
  Waves,
} from "lucide-react";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { StatusCard } from "./StatusCard";
import type { DemoSnapshot, ScenarioKey, UserProfile } from "../types";
import type { TabKey } from "../App";

// Import new views (we will create these)
import { ProductDetailsView } from "./views/ProductDetailsView";
import { DataAnalysisView } from "./views/DataAnalysisView";
import { MonitoringView } from "./views/MonitoringView";
import { FamilyInteractionView } from "./views/FamilyInteractionView";

interface AppShellProps {
  profile: UserProfile;
  scenario: ScenarioKey;
  snapshot: DemoSnapshot;
  onScenarioChange: (scenario: ScenarioKey) => void;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "product", label: "产品详细页" },
  { key: "analysis", label: "数据分析端" },
  { key: "monitor", label: "实时与长期监测" },
  { key: "interaction", label: "子女交互" },
];

export function AppShell({
  profile,
  scenario,
  snapshot,
  onScenarioChange,
  activeTab,
  onTabChange,
}: AppShellProps) {
  return (
    <main className="min-h-screen text-ink pb-10">
      {/* Top Navigation - Golden/Jade Theme */}
      <nav className="sticky top-0 z-50 w-full border-b border-gold-600/30 bg-mist/90 backdrop-blur shadow-gold">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient shadow-gold">
                <Shield className="h-6 w-6 text-mist" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-widest text-gold-400" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>
                  安行护腰
                </h1>
                <p className="text-xs tracking-wider text-gold-600/80 uppercase">皮诺曹智能守护引领者</p>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="flex space-x-1 border border-gold-600/40 rounded-full p-1 bg-dark-bg/50">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.key
                        ? "bg-gold-gradient text-mist shadow-gold font-bold"
                        : "text-gold-200 hover:bg-gold-600/20 hover:text-gold-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 w-24">
              {/* Placeholder for symmetry or other nav items */}
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        <div className="mb-6">
          <ScenarioSwitcher value={scenario} onChange={onScenarioChange} />
        </div>
        {/* Render Active View */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === "product" && <ProductDetailsView />}
          {activeTab === "analysis" && <DataAnalysisView snapshot={snapshot} profile={profile} />}
          {activeTab === "monitor" && <MonitoringView snapshot={snapshot} />}
          {activeTab === "interaction" && <FamilyInteractionView snapshot={snapshot} profile={profile} />}
        </div>
      </div>
    </main>
  );
}
