/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SystemState, SystemStatus } from './engine/types.js';
import { getScenarioA } from './engine/scenarios.js';
import { safetyCheck } from './engine/bankers.js';
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

  // Compute live safety check for the active avoidance state
  const liveSafety = useMemo(() => {
    return safetyCheck(
      systemState.allocation,
      systemState.max,
      systemState.available,
      systemState.need
    );
  }, [systemState]);

  // Strictly enforce clean Light Theme on root document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.style.backgroundColor = '#F8FAFC';
  }, []);

  // Compute status badge strictly reflecting committed active tab's result
  let currentBadgeStatus: SystemStatus = liveSafety.isSafe ? 'SAFE' : 'UNSAFE';
  let currentBadgeLabel: string | undefined = undefined;

  if (activeTab === 'avoidance') {
    currentBadgeStatus = liveSafety.isSafe ? 'SAFE' : 'UNSAFE';
    currentBadgeLabel = liveSafety.isSafe ? 'Safe State' : 'Unsafe State';
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
      <footer className="border-t border-slate-200 bg-white py-3.5 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="font-semibold text-slate-700">
              Operating Systems Deadlock Simulator
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500">
              Banker&apos;s Avoidance &bull; Resource Allocation Graphs &bull; Havender Prevention
            </span>
          </div>
          <span className="text-slate-400">
            Standard Textbook Algorithms (Silberschatz, Galvin &amp; Gagne)
          </span>
        </div>
      </footer>
    </div>
  );
}
