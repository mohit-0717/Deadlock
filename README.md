# Operating Systems Deadlock Simulator (DeadlockLab)

An interactive, educational Operating Systems dashboard implementing standard deadlock handling algorithms based on the authoritative textbook model (*Operating System Concepts* by Silberschatz, Galvin & Gagne).

🌐 **Live Production Deployment:** [deadlock-tawny.vercel.app](https://deadlock-tawny.vercel.app)  
📦 **GitHub Repository:** [mohit-0717/Deadlock](https://github.com/mohit-0717/Deadlock)

---

## Conceptual & Architectural Organization

All source files are strictly modularized and separated into dedicated folders according to their Operating Systems logic, concept, and functional role:

```
src/
├── engine/                            # Pure Algorithmic Engine (No React dependencies)
│   │
│   ├── [Topic 1: Deadlock Avoidance — Banker's Algorithm]
│   │   ├── bankersSafety.ts           # Dijkstra / Silberschatz Safety Algorithm (Need ≤ Work)
│   │   ├── bankersRequest.ts          # 3-Step Request Protocol (Need Check, Avail Check, Trial Rollback)
│   │   └── bankers.ts                 # Matrix vector operations & Avoidance hub exports
│   │
│   ├── [Topic 2: Deadlock Detection & Graph Reduction]
│   │   ├── detectionSingleInstance.ts # Single-instance Wait-For Graph (WFG) cycle detection via DFS
│   │   ├── detectionMultiInstance.ts  # Multi-instance matrix reduction algorithm (O(m · n²))
│   │   ├── detectionRecovery.ts       # Deadlock recovery via process termination & resource release
│   │   └── detection.ts               # Resource Allocation Graph (RAG) builder & Detection hub
│   │
│   ├── [Topic 3: Deadlock Prevention — Havender Principles]
│   │   ├── preventionOrdering.ts      # Havender linear resource ordering (Eliminating Circular Wait)
│   │   ├── preventionAllAtOnce.ts     # All-or-nothing admission gate (Eliminating Hold & Wait)
│   │   └── prevention.ts              # Prevention trade-off metrics & Prevention hub
│   │
│   └── [Topic 4: Data Models, Validation & Test Suite]
│       ├── types.ts                   # Strongly-typed TypeScript interfaces & SystemStatus models
│       ├── validation.ts              # Matrix dimension, non-negative integer & vector guardrails
│       ├── scenarios.ts               # Standard textbook scenarios (Scenarios A, B, C, D1, D2, D3)
│       └── engine.test.ts             # 45 Automated unit, regression, and property tests
│
├── components/                        # Educational Dashboard UI Layer (React + Tailwind CSS)
│   ├── AvoidanceTab.tsx               # Banker's algorithm matrix editor, step replay & request tester
│   ├── DetectionTab.tsx               # RAG visualization, cycle analysis & interactive recovery
│   ├── PreventionTab.tsx              # Interactive Havender ranking, admission gate & trade-off charts
│   ├── TestLabTab.tsx                 # Automated Algorithm Verification Suite (TC1 – TC6)
│   ├── RAGGraphView.tsx               # Interactive SVG bipartite Resource Allocation Graph renderer
│   ├── Navbar.tsx                     # Responsive navigation bar with live system status badge
│   └── StatusBadge.tsx                # Color-coded academic status indicator pill
│
├── App.tsx                            # Root application layout & global state coordinator
├── index.css                          # Modern typography, glassmorphism & Tailwind utilities
└── main.tsx                           # React 18 DOM bootstrap entrypoint
```

---

## Core Modules & Implemented Algorithms

### 1. Deadlock Avoidance (Banker's Algorithm)
* **Safety Algorithm** ([`src/engine/bankersSafety.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/bankersSafety.ts)):
  Evaluates whether a system state is safe by searching for a complete execution sequence where every process satisfies:
  $$\text{Need}_i \le \text{Work} \implies \text{Work} = \text{Work} + \text{Allocation}_i$$
  In textbook Scenario A, dynamically computes and verifies the safe sequence $\langle P_1, P_3, P_4, P_0, P_2 \rangle$.
* **Resource-Request Protocol** ([`src/engine/bankersRequest.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/bankersRequest.ts)):
  Pre-tests incoming requests through a strict 4-stage pipeline:
  1. **Stage 1 (Format Check):** Rejects negative quantities, non-integers, and dimensional mismatches with `INVALID_INPUT`.
  2. **Stage 2 (Claim Check):** Rejects requests exceeding declared maximum claim ($\text{Request}_i > \text{Need}_i$) with `INVALID_REQUEST`.
  3. **Stage 3 (Availability Check):** Defers requests exceeding free resources ($\text{Request}_i > \text{Available}$) into a `WAITING` queue without state mutation.
  4. **Stage 4 (Tentative Allocation & Safety Audit):** Simulates tentative grant:
     $$\text{Available}' = \text{Available} - \text{Request}_i$$
     $$\text{Allocation}'_i = \text{Allocation}_i + \text{Request}_i$$
     $$\text{Need}'_i = \text{Need}_i - \text{Request}_i$$
     If safe $\to$ **Commits state** (`SAFE`). If unsafe $\to$ **Atomic rollback** restores baseline matrices (`DENIED_UNSAFE`).

### 2. Deadlock Detection & Graph Reduction
* **Single-Instance Systems (Wait-For Graph Cycle Detection)** ([`src/engine/detectionSingleInstance.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/detectionSingleInstance.ts)):
  Constructs a directed Wait-For Graph (WFG) where edge $P_i \to P_j$ exists if $P_i$ is waiting for a resource held by $P_j$. Executes Depth-First Search (DFS) with path tracking to detect cycles. In single-instance systems, a cycle is both **necessary and sufficient** for deadlock.
* **Multi-Instance Systems (Matrix Reduction Algorithm)** ([`src/engine/detectionMultiInstance.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/detectionMultiInstance.ts)):
  Implements the textbook multi-instance detection algorithm in $O(m \cdot n^2)$ time. Iteratively marks processes whose outstanding request vector can be satisfied by currently free resources ($\text{Request}_i \le \text{Work}$), reclaiming their allocated resources. Unmarked processes upon algorithm termination form the deadlocked set.
* **Interactive Recovery** ([`src/engine/detectionRecovery.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/detectionRecovery.ts)):
  Supports terminating a deadlocked process, reclaiming its allocation, updating free vectors, and re-running matrix reduction to verify complete deadlock resolution.

### 3. Deadlock Prevention (Havender Principles)
* **Havender Fixed Resource Ordering** ([`src/engine/preventionOrdering.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/preventionOrdering.ts)):
  Assigns a strict global ascending rank to all resource types ($R_1 < R_2 < \dots < R_m$). Enforces the rule:
  $$\text{Request Allowed} \iff \text{Requested Rank} > \text{Held Rank}$$
  Mathematically invalidates **Coffman Condition #4 (Circular Wait)**. Features user-editable ranks with instant validation.
* **Request-All-At-Once Protocol** ([`src/engine/preventionAllAtOnce.ts`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/engine/preventionAllAtOnce.ts)):
  Requires processes to request and receive all resources before execution begins. If even one unit is unavailable, the process holds **zero** resources while waiting. Invalidates **Coffman Condition #2 (Hold & Wait)**. Features user-editable demand and available vectors with exact deficit diagnostics.
* **Trade-Off Analysis**:
  Compares unconstrained execution, Havender ordering, and conservative allocation across Resource Utilization (%), Concurrency Degree, and Wait Latency. Features dual sub-charts and normalized relative indices ($0\text{--}100\%$) to prevent measurement scale conflation.

### 4. Verification Test Suite (Test Lab)
* Automated verification lab ([`src/components/TestLabTab.tsx`](file:///c:/Users/mohit/Downloads/Deadlock-main/src/components/TestLabTab.tsx)) dynamically testing:
  - **TC1:** Baseline Safe State Verification (Scenario A).
  - **TC2:** Request Exceeding Available / Queueing (Scenario B).
  - **TC3:** Unsafe Request Rejection & Atomic Rollback (Scenario C).
  - **TC4:** Deadlock Detection in Single & Multi-Instance Systems (Scenario D1 & D2).
  - **TC5:** Prevention Policy Guardrails (Scenario E).
  - **TC6:** Input Boundary & Dimensional Integrity (Scenario F).

---

## Standard Textbook Scenarios Included

| Scenario | Model Type | Characteristics | Expected Output |
| :--- | :--- | :--- | :--- |
| **Scenario A** | Banker's Avoidance | 5 processes ($P_0\dots P_4$), 3 resources ($A,B,C$), $\text{Available}=[3,3,2]$ | Safe sequence $\langle P_1, P_3, P_4, P_0, P_2 \rangle$ |
| **Scenario B** | Banker's Request | $P_0$ requests $[7, 4, 3] > \text{Available}$ | Deferred into `WAITING` queue |
| **Scenario C** | Banker's Request | $P_0$ requests $[0, 0, 2]$, tentative $\text{Available}=[3, 3, 0]$ | `DENIED_UNSAFE` with atomic rollback |
| **Scenario D1** | Detection (Single-Instance) | 2 processes in circular wait ($P_1 \to R_2 \to P_2 \to R_1 \to P_1$) | Deadlock confirmed on $\{P_1, P_2\}$ |
| **Scenario D2** | Detection (Multi-Instance) | Multi-instance deadlock on $P_1, P_2, P_3, P_4$ | Deadlock confirmed on $\{P_1, P_2, P_3, P_4\}$ |
| **Scenario D3** | Cycle $\ne$ Deadlock | Cycle exists in RAG, but multiple instances allow complete reduction | System is `SAFE` (Deadlock-Free) |

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm or pnpm

### Installation
```bash
git clone https://github.com/mohit-0717/Deadlock.git
cd Deadlock
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the simulator in your browser.

### Run Automated Test Suite
```bash
npm test
```
Runs the full suite of **45 automated unit and regression tests** via the Node.js test runner.

### Production Build
```bash
npm run build
```
Creates an optimized production build in the `dist/` directory.

---

## Technical Stack

- **Frontend Framework:** React 18 with TypeScript (Strict mode enabled)
- **Styling:** Tailwind CSS with custom glassmorphism and animated status badges
- **Chart Visualizations:** Recharts (Dual Y-Axis and Normalized Scale views)
- **Graph Engine:** Custom SVG bipartite graph renderer for Resource Allocation Graphs
- **Icons:** Lucide React
- **Test Runner:** Native Node.js Test Runner (`node:test`, `node:assert/strict`) with `tsx`
- **Build Tool:** Vite 8
- **Continuous Deployment:** Vercel (linked directly to the `main` branch)

---

## Authors & Academic Integrity

Developed for undergraduate Computer Engineering Operating Systems coursework. All algorithm implementations strictly adhere to the academic mathematical specifications defined in Silberschatz, Galvin & Gagne's *Operating System Concepts*.
