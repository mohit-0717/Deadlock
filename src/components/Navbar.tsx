import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShieldCheck,
  Search,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Cpu,
  Sparkles,
  Gauge,
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
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  onOpenDemoTour: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentStatus,
  statusLabel,
  speed,
  onSpeedChange,
  reduceMotion,
  onToggleReduceMotion,
  onOpenDemoTour,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const tabs = [
    { id: 'avoidance', label: "Banker's Avoidance", icon: ShieldCheck },
    { id: 'detection', label: 'Detection & Recovery', icon: Search },
    { id: 'prevention', label: 'Prevention & Policies', icon: Layers },
    { id: 'testlab', label: 'Test Lab (TC1–TC6)', icon: CheckCircle2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Module Switcher */}
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-sans font-extrabold text-xs tracking-tight shadow-sm ring-1 ring-white/10">
              DL
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white font-sans">
                DeadlockLab
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-sans">
                OS Kernel v2
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-5 bg-slate-700/80 shrink-0" />

          {/* 4 Core Module Tabs */}
          <nav aria-label="Modules" className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-sans flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm border border-indigo-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Global Status Badge & Quick Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Status Badge */}
          <div className="shrink-0">
            <StatusBadge status={currentStatus} customLabel={statusLabel} size="md" />
          </div>

          {/* Guided Tour Trigger */}
          <button
            onClick={onOpenDemoTour}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer shadow-xs"
            title="Launch guided demonstration tour"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tour</span>
          </button>

          {/* Speed Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-sans text-slate-200 shadow-xs">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-sans font-semibold"
              aria-label="Simulation speed"
            >
              <option value={0.5} className="bg-slate-900 text-white">0.5x</option>
              <option value={1} className="bg-slate-900 text-white">1.0x</option>
              <option value={1.5} className="bg-slate-900 text-white">1.5x</option>
              <option value={2} className="bg-slate-900 text-white">2.0x</option>
            </select>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
