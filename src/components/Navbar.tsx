import React from 'react';
import {
  ShieldCheck,
  Search,
  Layers,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { SystemStatus } from '../engine/types.js';
import { StatusBadge } from './StatusBadge.js';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentStatus: SystemStatus;
  statusLabel?: string;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  reduceMotion?: boolean;
  onToggleReduceMotion?: () => void;
  onOpenDemoTour?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentStatus,
  statusLabel,
}) => {
  const tabs = [
    {
      id: 'avoidance',
      fullLabel: "Banker's Algorithm (Avoidance)",
      shortLabel: "Banker's Algorithm",
      icon: ShieldCheck,
    },
    {
      id: 'detection',
      fullLabel: 'Resource Allocation Graph (Detection)',
      shortLabel: 'RAG Detection',
      icon: Search,
    },
    {
      id: 'prevention',
      fullLabel: 'Deadlock Prevention (Havender)',
      shortLabel: 'Prevention',
      icon: Layers,
    },
    {
      id: 'testlab',
      fullLabel: 'Verification Suite (Test Lab)',
      shortLabel: 'Verification Lab',
      icon: CheckCircle2,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs">
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Academic Title & Logo */}
        <div className="flex items-center gap-3 lg:gap-5 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  Deadlock Simulator
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">
                  OS Lab
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden xl:block whitespace-nowrap">
                Operating Systems Principles (Silberschatz Model)
              </p>
            </div>
          </div>

          {/* Academic Tab Navigation (Desktop & Laptop) */}
          <nav aria-label="Course Modules" className="hidden md:flex items-center gap-1 min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  title={tab.fullLabel}
                  className={`px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="hidden 2xl:inline">{tab.fullLabel}</span>
                  <span className="2xl:inline hidden">{/* Spacer */}</span>
                  <span className="2xl:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Clean Academic System Status Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="text-right hidden xl:block">
            <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
              Current System State
            </span>
            <span className="text-xs font-bold text-slate-800">
              {activeTab === 'avoidance'
                ? "Banker's Safety Check"
                : activeTab === 'detection'
                ? 'RAG Topology'
                : activeTab === 'prevention'
                ? 'Prevention Protocol'
                : 'Verification Suite'}
            </span>
          </div>
          <StatusBadge status={currentStatus} customLabel={statusLabel} size="md" />
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-t border-slate-200 px-3 py-1.5 flex items-center gap-1 overflow-x-auto bg-slate-50 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>
                {tab.id === 'avoidance'
                  ? "Banker's (Avoidance)"
                  : tab.id === 'detection'
                  ? 'RAG Detection'
                  : tab.id === 'prevention'
                  ? 'Prevention'
                  : 'Test Lab'}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
