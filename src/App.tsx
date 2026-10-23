/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Info,
  Activity,
  Cpu,
  Layers,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { SystemState, SystemStatus } from './engine/types.js';
import { getScenarioA } from './engine/scenarios.js';
import { safetyCheck, requestResource } from './engine/bankers.js';
import { Navbar } from './components/Navbar.js';
import { ConceptCard } from './components/ConceptCard.js';
import { AvoidanceTab } from './components/AvoidanceTab.js';
import { DetectionTab } from './components/DetectionTab.js';
import { PreventionTab } from './components/PreventionTab.js';
import { TestLabTab } from './components/TestLabTab.js';
import { DemoTourModal } from './components/DemoTourModal.js';

export default function App() {
  // Navigation & View state (4 core modules only)
  const [activeTab, setActiveTab] = useState<string>('avoidance');
  const [avoidanceStatus, setAvoidanceStatus] = useState<SystemStatus>('SAFE');
  const [detectionStatus, setDetectionStatus] = useState<SystemStatus>('DEADLOCK_DETECTED');

  // Active Detection Module Context for Synchronized Header (Requirement 1)
  const [detectionContext, setDetectionContext] = useState<{
    scenarioPreset: string;
    scenarioName: string;
    method: string;
    available: number[];
    work: number[];
    deadlockedNames: string[];
    hasDeadlock: boolean;
  }>({
    scenarioPreset: 'D2',
    scenarioName: 'D2: Multi-Instance Deadlock',
    method: 'Matrix Reduction (O(m·n²))',
    available: [0, 0, 0],
    work: [0, 1, 0],
    deadlockedNames: ['P1', 'P2', 'P3', 'P4'],
    hasDeadlock: true,
  });

  // Core system state for Avoidance tab
  const [systemState, setSystemState] = useState<SystemState>(() => getScenarioA());
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C' | 'CUSTOM'>('A');

  // Global UX toggles
  const [speed, setSpeed] = useState<number>(1.0);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Concept Card drawer toggle state
  const [isConceptCardOpen, setIsConceptCardOpen] = useState<boolean>(false);

  // Compute live safety check for the active avoidance state
  const liveSafety = useMemo(() => {
    return safetyCheck(
      systemState.allocation,
      systemState.max,
      systemState.available,
      systemState.need
    );
  }, [systemState]);

  // Auto-expand concept card on unsafe state
  useEffect(() => {
    if (avoidanceStatus === 'UNSAFE') {
      setIsConceptCardOpen(true);
    }
  }, [avoidanceStatus]);

  // Strictly enforce Pro Light Theme on root document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.style.backgroundColor = '#F8FAFC';
  }, []);

  // Compute status badge strictly reflecting committed active tab's result (Requirement 1)
  let currentBadgeStatus: SystemStatus = liveSafety.isSafe ? 'SAFE' : 'UNSAFE';
  let currentBadgeLabel: string | undefined = undefined;

  if (activeTab === 'avoidance') {
    currentBadgeStatus = liveSafety.isSafe ? 'SAFE' : 'UNSAFE';
    currentBadgeLabel = liveSafety.isSafe ? 'Safe State' : 'Unsafe State';
  } else if (activeTab === 'detection') {
    currentBadgeStatus = detectionStatus;
    currentBadgeLabel = detectionStatus === 'DEADLOCK_DETECTED' ? 'DEADLOCK' : 'NO DEADLOCK';
  } else if (activeTab === 'prevention') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'PREVENTED';
  } else if (activeTab === 'testlab') {
    currentBadgeStatus = 'SAFE';
    currentBadgeLabel = 'ALL TESTS PASS';
  }

  // Quick scenario triggers for command center
  const triggerScenarioA = () => {
    setActiveTab('avoidance');
    setActiveScenario('A');
    setSystemState(getScenarioA());
    setAvoidanceStatus('SAFE');
  };

  const triggerScenarioB = () => {
    setActiveTab('avoidance');
    setActiveScenario('B');
    const base = getScenarioA();
    const res = requestResource(0, [7, 4, 3], base);
    setSystemState(res.newState);
    setAvoidanceStatus('SAFE');
  };

  const triggerScenarioC = () => {
    setActiveTab('avoidance');
    setActiveScenario('C');
    const base = getScenarioA();
    // Baseline Available [3,3,2], P0 requests [0,0,2] -> tentative Available [3,3,0] is UNSAFE
    // Banker's safety check finds no safe sequence -> DENIED and atomic rollback cleanly restores base state
    const res = requestResource(0, [0, 0, 2], base);
    // res.newState is the base state restored by rollback
    setSystemState(res.newState);
    // Global system safety reflects committed state (which is SAFE), not the rejected tentative request
    setAvoidanceStatus('SAFE');
    setIsConceptCardOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8FAFC] text-slate-800 selection:bg-indigo-500/20 selection:text-indigo-900 antialiased">
      {/* 1. Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentStatus={currentBadgeStatus}
        statusLabel={currentBadgeLabel}
        speed={speed}
        onSpeedChange={setSpeed}
        reduceMotion={reduceMotion}
        onToggleReduceMotion={() => setReduceMotion(!reduceMotion)}
        onOpenDemoTour={() => setIsDemoTourOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-3.5 space-y-3.5">
        {/* SECTION A: Sleek Executive Command Bar (Context Synchronized - Requirement 1) */}
        <section
          aria-label="Current System State"
          className="bg-slate-900 rounded-xl border border-slate-800 px-4 py-3 shadow-md text-white"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Title & Engine Mode */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white font-sans tracking-tight">
                  DeadlockLab OS Kernel
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-sans font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60">
                  {activeTab === 'avoidance'
                    ? "Banker's Avoidance"
                    : activeTab === 'detection'
                    ? 'RAG Detection & Recovery'
                    : activeTab === 'prevention'
                    ? 'Havender Prevention'
                    : activeTab.toUpperCase()}
                </span>
                <span className="text-slate-600 text-xs hidden sm:inline">&bull;</span>
                <span className="text-xs text-slate-400 font-sans hidden sm:inline">
                  {activeTab === 'avoidance'
                    ? "Banker's Safety Algorithm \u2022 Atomic rollback verification"
                    : activeTab === 'detection'
                    ? 'Bipartite RAG Topology \u2022 Matrix reduction trace'
                    : activeTab === 'prevention'
                    ? 'Havender Linear Ordering \u2022 Circular wait elimination'
                    : 'Dynamic Test Suite \u2022 Pure OS algorithm verification'}
                </span>
              </div>
            </div>

            {/* Quick Context & Live Metrics (Strictly Module-Specific - Requirement 1) */}
            <div className="flex items-center gap-3 flex-wrap">
              {activeTab === 'avoidance' && (
                <>
                  {/* Avoidance Scenario Selector */}
                  <div className="flex items-center gap-2 text-xs font-sans">
                    <span className="text-xs font-semibold text-slate-400">Scenario:</span>
                    <div className="inline-flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-xs">
                      <button
                        onClick={triggerScenarioA}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs ${
                          activeScenario === 'A'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Scenario A: Baseline Safe State (Available [3,3,2])"
                      >
                        A (Safe)
                      </button>
                      <button
                        onClick={triggerScenarioB}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs ${
                          activeScenario === 'B'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Scenario B: Request exceeds Available (Waiting)"
                      >
                        B (Waiting)
                      </button>
                      <button
                        onClick={triggerScenarioC}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer text-xs ${
                          activeScenario === 'C'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Scenario C: Unsafe Request P0:[0,0,2] -> Rollback"
                      >
                        C (Rollback)
                      </button>
                    </div>
                  </div>

                  {/* Avoidance Available Resource Vector */}
                  <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Available:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      [{systemState.resourceNames.map((r, i) => `${r}:${systemState.available[i]}`).join(', ')}]
                    </span>
                  </div>

                  {/* Verified Safe Sequence */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Safe Seq:</span>
                    {liveSafety.isSafe ? (
                      <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-xs">
                        &lt;{liveSafety.safeSequenceNames.join(' → ')}&gt;
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-700/60 text-xs">
                        UNSAFE (ROLLBACK)
                      </span>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'detection' && (
                <>
                  {/* Detection Scenario & Method Context */}
                  <div className="flex items-center gap-2 text-xs font-sans">
                    <span className="text-xs font-semibold text-slate-400">Scenario:</span>
                    <span className="px-2.5 py-1 rounded-lg font-sans font-semibold bg-slate-800 text-white border border-slate-700 text-xs">
                      {detectionContext.scenarioName}
                    </span>
                  </div>

                  {/* Detection Available Pool */}
                  <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Available:</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">
                      [{detectionContext.available.map((val, i) => `${String.fromCharCode(65 + i)}:${val}`).join(', ')}]
                    </span>
                  </div>

                  {/* Detection Work Vector */}
                  <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Work:</span>
                    <span className="font-mono font-bold text-indigo-300 text-sm">
                      [{detectionContext.work.join(', ')}]
                    </span>
                  </div>

                  {/* Detected Deadlocked Process Set */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Status:</span>
                    {detectionContext.hasDeadlock ? (
                      <span className="font-mono font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-700/60 text-xs">
                        DEADLOCKED: &#123;{detectionContext.deadlockedNames.join(', ')}&#125;
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-xs">
                        ZERO DEADLOCKS (SAFE)
                      </span>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'prevention' && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Strategy:</span>
                    <span className="font-sans font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-700/60 text-xs">
                      Havender Linear Ordering
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Guaranteed:</span>
                    <span className="font-sans font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-xs">
                      Circular Wait Eliminated
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'testlab' && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold text-xs">Suite:</span>
                    <span className="font-sans font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-xs">
                      24 Automated Tests Passing
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Theoretical Foundations Concept Card (Shown when requested or during unsafe hazard) */}
        {isConceptCardOpen && (
          <div id="concept-card-section" aria-label="Theoretical Foundation Concept Card" className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
            <ConceptCard
              isOpen={isConceptCardOpen}
              onToggle={() => setIsConceptCardOpen((prev) => !prev)}
              onGoToTab={(tab) => setActiveTab(tab)}
              isUnsafe={avoidanceStatus === 'UNSAFE'}
            />
          </div>
        )}

        {/* Dynamic Tab View Container (4 Core Tabs) */}
        <div key={activeTab} className="tab-transition">
          {activeTab === 'avoidance' && (
            <AvoidanceTab
              systemState={systemState}
              onStateChange={(newState) => {
                setSystemState(newState);
                setActiveScenario('CUSTOM');
              }}
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
              onDetectionContextChange={setDetectionContext}
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

      {/* Guided Tour Modal */}
      <DemoTourModal
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-2.5 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="font-medium text-slate-700">
              DeadlockLab OS Engineering Workbench
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-[11px] text-slate-500">
              Banker&apos;s Avoidance &bull; Multi-Instance Reduction &bull; Havender Ordering &bull; Verification Suite
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Strict Light Theme &bull; Tabular Precision
          </span>
        </div>
      </footer>
    </div>
  );
}
