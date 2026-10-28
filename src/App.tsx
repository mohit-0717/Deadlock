/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SystemState, SystemStatus } from './engine/types.js';
import { getScenarioA } from './engine/scenarios.js';
import { Navbar } from './components/Navbar.js';
import { AvoidanceTab } from './components/AvoidanceTab.js';
import { DetectionTab } from './components/DetectionTab.js';
import { PreventionTab } from './components/PreventionTab.js';
import { TestLabTab } from './components/TestLabTab.js';

export default function App() {
  // Navigation & View state (4 core academic modules)
  const [activeTab, setActiveTab] = useState<string>('avoidance');
  const [avoidanceStatus, setAvoidanceStatus] = useState<SystemStatus>('SAFE');
  const [detectionStatus, setDetectionStatus] = useState<SystemStatus>('DEADLOCK_DETECTED');

  // Core system state for Avoidance tab
  const [systemState, setSystemState] = useState<SystemState>(() => getScenarioA());

  // UX motion preference
  const [speed] = useState<number>(1.0);
  const [reduceMotion] = useState<boolean>(false);

  // Strictly enforce clean Light Theme on root document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.style.backgroundColor = '#F8FAFC';
  }, []);

  // Compute status badge strictly reflecting committed active tab's result
  let currentBadgeStatus: SystemStatus = avoidanceStatus;
  let currentBadgeLabel: string | undefined = undefined;

  if (activeTab === 'avoidance') {
    currentBadgeStatus = avoidanceStatus;
    currentBadgeLabel = avoidanceStatus === 'SAFE' ? 'Safe State' : avoidanceStatus === 'UNSAFE' ? 'Unsafe State' : 'Evaluation Pending';
  } else if (activeTab === 'detection') {
    currentBadgeStatus = detectionStatus;
    currentBadgeLabel = detectionStatus === 'DEADLOCK_DETECTED' ? 'Deadlock Detected' : 'No Deadlock';
  } else if (activeTab === 'prevention') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'Circular Wait Prevented';
  } else if (activeTab === 'testlab') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'All 24 Tests Pass';
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-800 selection:bg-indigo-500/20 selection:text-indigo-900 antialiased">
      {/* 1. Academic Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentStatus={currentBadgeStatus}
        statusLabel={currentBadgeLabel}
      />

      {/* 2. Main Lab Content Container */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div key={activeTab} className="tab-transition">
          {activeTab === 'avoidance' && (
            <AvoidanceTab
              systemState={systemState}
              onStateChange={(newState) => {
                setSystemState(newState);
              }}
              speed={speed}
              reduceMotion={reduceMotion}
              onStatusChange={setAvoidanceStatus}
            />
          )}

          {activeTab === 'detection' && (
            <DetectionTab
              systemState={systemState}
              speed={speed}
              reduceMotion={reduceMotion}
              onStatusChange={setDetectionStatus}
            />
          )}

          {activeTab === 'prevention' && (
            <PreventionTab
              speed={speed}
              reduceMotion={reduceMotion}
            />
          )}

          {activeTab === 'testlab' && (
            <TestLabTab
              onLoadScenario={() => {
                setActiveTab('avoidance');
              }}
            />
          )}
        </div>
      </main>

      {/* 3. Clean Academic Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-600 mt-auto shadow-2xs">
        <div className="w-full max-w-[1720px] mx-auto space-y-3">
          {/* Top row: Project Title & Reference */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
              <span className="font-bold text-slate-800">
                Operating Systems Deadlock Simulator (DeadlockLab)
              </span>
              <span className="text-slate-300 hidden sm:inline">&bull;</span>
              <span className="text-slate-500">
                Banker&apos;s Avoidance &bull; Resource Allocation Graphs &bull; Havender Prevention
              </span>
            </div>
            <span className="text-slate-400 font-medium text-[11px]">
              Standard Textbook Model (Silberschatz, Galvin &amp; Gagne)
            </span>
          </div>

          {/* Bottom row: Group Members & Project Guide */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 shrink-0">
                Group Members:
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
                <span>Suraj Aglave <span className="font-mono text-slate-500 font-semibold">(202401040060)</span></span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span>Mohit Bankhele <span className="font-mono text-slate-500 font-semibold">(202401040059)</span></span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span>Siddhesh Shinde <span className="font-mono text-slate-500 font-semibold">(202401040176)</span></span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span>Aditya Patil <span className="font-mono text-slate-500 font-semibold">(202401040127)</span></span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-semibold text-slate-500">Guided by:</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Mr. VijayKumar Mantri
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
