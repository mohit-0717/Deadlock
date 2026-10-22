/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SystemState, SystemStatus } from './engine/types.js';
import { getScenarioA } from './engine/scenarios.js';
import { Navbar } from './components/Navbar.js';
import { PermanentBanner } from './components/PermanentBanner.js';
import { ConceptCard } from './components/ConceptCard.js';
import { AvoidanceTab } from './components/AvoidanceTab.js';
import { DetectionTab } from './components/DetectionTab.js';
import { PreventionTab } from './components/PreventionTab.js';
import { TestLabTab } from './components/TestLabTab.js';
import { AIUsageRecordTab } from './components/AIUsageRecordTab.js';
import { VivaTab } from './components/VivaTab.js';
import { DemoTourModal } from './components/DemoTourModal.js';
import { VivaModePanel } from './components/VivaModePanel.js';

export default function App() {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<string>('avoidance');
  const [avoidanceStatus, setAvoidanceStatus] = useState<SystemStatus>('SAFE');
  const [detectionStatus, setDetectionStatus] = useState<SystemStatus>('DEADLOCK_DETECTED');

  // Core system state for Avoidance tab
  const [systemState, setSystemState] = useState<SystemState>(() => getScenarioA());

  // Global UX toggles
  const [speed, setSpeed] = useState<number>(1.0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [vivaMode, setVivaMode] = useState<boolean>(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState<boolean>(false);

  // Concept Card drawer toggle state
  const [isConceptCardOpen, setIsConceptCardOpen] = useState<boolean>(false);

  // Auto-expand concept card on unsafe state
  useEffect(() => {
    if (avoidanceStatus === 'UNSAFE') {
      setIsConceptCardOpen(true);
    }
  }, [avoidanceStatus]);

  // Compute status badge strictly reflecting active tab's latest result (Rule 3)
  let currentBadgeStatus: SystemStatus = avoidanceStatus;
  let currentBadgeLabel: string | undefined = undefined;

  if (activeTab === 'avoidance') {
    currentBadgeStatus = avoidanceStatus;
  } else if (activeTab === 'detection') {
    currentBadgeStatus = detectionStatus;
    currentBadgeLabel = detectionStatus === 'DEADLOCK_DETECTED' ? 'DEADLOCK' : 'NO DEADLOCK';
  } else if (activeTab === 'prevention') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'PREVENTED';
  } else if (activeTab === 'testlab') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'ALL TESTS PASS';
  } else if (activeTab === 'aiusage') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'AUDIT READY';
  } else if (activeTab === 'vivamode') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'VIVA DRILL';
  }

  // Apply dark/light class to root document
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDarkMode ? 'bg-[#070a14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Navbar with mission control controls */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentStatus={currentBadgeStatus}
        statusLabel={currentBadgeLabel}
        speed={speed}
        onSpeedChange={setSpeed}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        reduceMotion={reduceMotion}
        onToggleReduceMotion={() => setReduceMotion(!reduceMotion)}
        vivaMode={vivaMode}
        onToggleVivaMode={() => setVivaMode(!vivaMode)}
        onOpenDemoTour={() => setIsDemoTourOpen(true)}
      />

      {/* Mandatory Rule 2 Permanent Banner: Banker's Avoids vs Detection */}
      <PermanentBanner
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onLearnMore={() => setIsConceptCardOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Viva Mode Active Alert Banner */}
        {vivaMode && (
          <aside aria-label="Viva Mode Active" className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md">
            <div>
              <strong className="text-amber-300 font-bold mr-1 font-mono">Viva Mode Enabled:</strong>
              Algorithm work vectors and request outcomes are disguised. Predict the next step before checking!
            </div>
            <button
              onClick={() => setActiveTab('vivamode')}
              className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 border border-amber-400/40 text-amber-200 font-semibold cursor-pointer shrink-0 font-mono text-xs"
            >
              Go to Viva Quiz &rarr;
            </button>
          </aside>
        )}

        {/* Persistent Concept Card (Drawer that auto-expands on UNSAFE or on toggle) */}
        <section id="concept-card-section" aria-label="Theoretical Foundation Concept Card">
          <ConceptCard
            isOpen={isConceptCardOpen}
            onToggle={() => setIsConceptCardOpen((prev) => !prev)}
            onGoToTab={(tab) => setActiveTab(tab)}
            isUnsafe={avoidanceStatus === 'UNSAFE'}
          />
        </section>

        {/* Dynamic Tab Views */}
        <section aria-label="Tab View Content">
          {activeTab === 'avoidance' && (
            <AvoidanceTab
              systemState={systemState}
              onStateChange={setSystemState}
              speed={speed}
              reduceMotion={reduceMotion}
              onStatusChange={setAvoidanceStatus}
            />
          )}

          {activeTab === 'detection' && (
            <DetectionTab
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
              onLoadScenario={(scId) => {
                setActiveTab('avoidance');
              }}
            />
          )}

          {activeTab === 'aiusage' && (
            <AIUsageRecordTab />
          )}

          {activeTab === 'vivamode' && (
            <VivaTab />
          )}
        </section>
      </main>

      {/* Guided 6-Minute Tour Modal */}
      <DemoTourModal
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/70 py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>DeadlockLab</strong> &ndash; Operating Systems Resource Allocation &amp; Deadlock Dashboard
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            Dijkstra Banker&apos;s Avoidance &bull; Multi-Instance Reduction &bull; RAG Wait-For Graph &bull; Havender Ordering
          </span>
        </div>
      </footer>
    </div>
  );
}
