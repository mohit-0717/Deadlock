import React from 'react';
import {
  Layers,
  ShieldCheck,
  Search,
  Sparkles,
  Award,
  Zap,
  Gauge,
  Sun,
  Moon,
  Activity,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { SystemStatus } from '../engine/types.js';
import { StatusBadge } from './StatusBadge.js';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentStatus: SystemStatus;
  statusLabel?: string;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  vivaMode: boolean;
  onToggleVivaMode: () => void;
  onOpenDemoTour: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentStatus,
  statusLabel,
  speed,
  onSpeedChange,
  isDarkMode,
  onToggleTheme,
  reduceMotion,
  onToggleReduceMotion,
  vivaMode,
  onToggleVivaMode,
  onOpenDemoTour,
}) => {
  const tabs = [
    { id: 'avoidance', label: "Banker's Avoidance", short: 'Avoidance', icon: ShieldCheck },
    { id: 'detection', label: 'Detection & Recovery', short: 'Detection', icon: Search },
    { id: 'prevention', label: 'Prevention & Policies', short: 'Prevention', icon: Layers },
    { id: 'testlab', label: 'Test Lab (TC1-TC6)', short: 'Test Lab', icon: CheckCircle2 },
    { id: 'aiusage', label: 'AI Usage Record', short: 'AI Audit', icon: Sparkles },
    { id: 'vivamode', label: 'Viva Drill', short: 'Viva Mode', icon: Award },
  ];

  return (
    <header className="sticky top-0 z-40 w-full cockpit-glass bg-slate-950/85 backdrop-blur-xl border-b border-cyan-500/20 shadow-2xl transition-all">
      {/* Top Cockpit Command Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Telemetry Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-mono font-black text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/50">
              DL
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse ring-2 ring-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
                <span>DeadlockLab</span>
              </h1>
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 uppercase">
                Mission Control
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-mono">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>OS Resource Allocation &amp; Deadlock Telemetry</span>
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Persistent Status Badge */}
          <div className="mr-1">
            <StatusBadge status={currentStatus} customLabel={statusLabel} size="sm" />
          </div>

          {/* 6-Min Guided Tour Button */}
          <button
            onClick={onOpenDemoTour}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-400/30 active:scale-95"
            title="Launch interactive 6-minute guided demonstration"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span className="font-semibold">6-Min Tour</span>
          </button>

          {/* Viva Mode Toggle */}
          <button
            onClick={onToggleVivaMode}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              vivaMode
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900/80 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
            title="Toggle Viva Mode: hides explanations to test your prediction abilities"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Viva Mode</span>
          </button>

          {/* Global Speed Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded-lg text-xs font-mono shadow-inner">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-mono"
              aria-label="Animation replay speed"
            >
              <option value={0.5} className="bg-slate-900">0.5x</option>
              <option value={1} className="bg-slate-900">1.0x</option>
              <option value={1.5} className="bg-slate-900">1.5x</option>
              <option value={2} className="bg-slate-900">2.0x</option>
              <option value={3} className="bg-slate-900">3.0x</option>
            </select>
          </div>

          {/* Accessibility: Reduce Motion */}
          <button
            onClick={onToggleReduceMotion}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
              reduceMotion
                ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={reduceMotion ? 'Reduced Motion: ACTIVE' : 'Reduced Motion: OFF'}
            aria-label="Toggle reduced motion accessibility"
          >
            <Zap className={`w-4 h-4 ${reduceMotion ? 'text-cyan-400' : 'text-slate-500'}`} />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-slate-200 cursor-pointer transition-all hover:border-slate-600"
            title="Toggle Dark / Light Theme"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Tabs Telemetry Navigation Bar */}
      <nav aria-label="Main Navigation" className="border-t border-slate-800/80 px-4 sm:px-6 bg-slate-950/60">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
