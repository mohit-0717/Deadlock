# Operating Systems Deadlock Simulator

An interactive, educational simulator implementing standard Operating Systems deadlock algorithms based on the textbook model (*Operating System Concepts* by Silberschatz, Galvin & Gagne).

---

## Algorithms Implemented

### 1. Deadlock Avoidance (Banker's Algorithm)
- **Safety Algorithm** (`src/engine/bankersSafety.ts`):
  Evaluates whether the current allocation state is safe by finding a complete safe execution sequence $\langle P_1, P_3, P_4, P_0, P_2 \rangle$ using the rule:
  $$\text{Need}_i \le \text{Work} \implies \text{Work} = \text{Work} + \text{Allocation}_i$$
- **Resource-Request Algorithm** (`src/engine/bankersRequest.ts`):
  Pre-tests incoming requests before allocation:
  1. $\text{Request}_i \le \text{Need}_i$ (must not exceed declared max claim)
  2. $\text{Request}_i \le \text{Available}$ (must not exceed free pool)
  3. Trial allocation & safety check $\to$ **Grant & Commit** or **Deny & Rollback**.

### 2. Deadlock Detection & Recovery
- **Single-Instance Systems (Wait-For Graph Cycle Detection)** (`src/engine/detectionSingleInstance.ts`):
  Constructs a directed Wait-For Graph (WFG) and uses Depth-First Search (DFS) to detect cycles. In single-instance systems, a cycle is both necessary and sufficient for deadlock.
- **Multi-Instance Systems (Matrix Reduction Algorithm)** (`src/engine/detectionMultiInstance.ts`):
  Reduces allocation and request matrices using time complexity $O(m \cdot n^2)$ to identify the exact set of deadlocked processes.
- **Deadlock Recovery by Process Termination** (`src/engine/detectionRecovery.ts`):
  Reclaims resources from selected victim processes and verifies system recovery.

### 3. Deadlock Prevention (Havender Principles)
- **Havender Fixed Resource Ordering** (`src/engine/preventionOrdering.ts`):
  Enforces a global linear hierarchy ($R_1 < R_2 < \dots < R_m$) to mathematically eliminate Coffman Condition #4 (Circular Wait).
- **Request-All-At-Once Protocol** (`src/engine/preventionAllAtOnce.ts`):
  Forces processes to acquire all resources before execution begins or hold none while waiting, eliminating Coffman Condition #2 (Hold and Wait).

---

## Project Structure

```
├── src/
│   ├── engine/                        # Core OS Algorithms
│   │   ├── bankersSafety.ts           # Banker's Safety Algorithm
│   │   ├── bankersRequest.ts          # Banker's Resource-Request Algorithm
│   │   ├── bankers.ts                 # Need computation & hub exports
│   │   ├── detectionSingleInstance.ts # WFG Cycle Detection Algorithm
│   │   ├── detectionMultiInstance.ts  # Multi-Instance Matrix Reduction
│   │   ├── detectionRecovery.ts       # Victim Termination & Recovery
│   │   ├── detection.ts               # RAG Graph Builder & hub exports
│   │   ├── preventionOrdering.ts      # Havender Linear Hierarchy Policy
│   │   ├── preventionAllAtOnce.ts     # Request-All-At-Once Gate Policy
│   │   ├── prevention.ts              # Prevention Metrics & hub exports
│   │   ├── scenarios.ts               # Textbook Benchmarks (Silberschatz)
│   │   ├── validation.ts              # Matrix & Input Validation
│   │   ├── types.ts                   # TypeScript Domain Types
│   │   └── engine.test.ts             # 24 Unit & Regression Tests
│   ├── components/                    # User Interface Components
│   │   ├── Navbar.tsx                 # Academic Navigation Bar
│   │   ├── AvoidanceTab.tsx           # Banker's Algorithm Interactive View
│   │   ├── DetectionTab.tsx           # RAG Detection & Recovery View
│   │   ├── PreventionTab.tsx          # Prevention Policies & Trade-offs
│   │   ├── TestLabTab.tsx             # Automated Verification Suite View
│   │   ├── RAGGraphView.tsx           # SVG Bipartite Graph Visualization
│   │   └── StatusBadge.tsx            # Clean State Indicator Pill
│   ├── App.tsx                        # Main Academic Layout
│   ├── index.css                      # Styling & Animations
│   └── main.tsx                       # React Entrypoint
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Installation
```bash
npm install
```

### Run Locally
```bash
npm run dev
```
Open `http://localhost:3000/` in your browser.

### Run Verification Test Suite
```bash
npm test
```
Executes all 24 automated unit tests covering Banker's safety, request grant/denial/rollback, WFG cycle detection, matrix reduction, and Havender ordering.

### Production Build
```bash
npm run build
```
