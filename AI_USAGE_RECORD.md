# AI Usage Record

**Assignment:** OS IA Assignment Activity - 2 (AI-Assisted Dashboard Development & Deadlock Analysis)  
**Academic Course:** Operating Systems  
**Model Framework:** Silberschatz, Galvin & Gagne (*Operating System Concepts*)

---

## Required Documentation Table

| AI Tool Used | Purpose | Output Generated | Student Verification |
| :--- | :--- | :--- | :--- |
| **Google Gemini / Claude** | **Dashboard Design** | Initial UI layout concepts, React component hierarchy, and tab structure for Avoidance, Detection, Prevention, and Test Lab views. | Reviewed and simplified UI components. Removed complex nested cards and dark banners to ensure a clean, accessible textbook-standard light interface matching university lab guidelines. |
| **Claude / GitHub Copilot** | **Algorithm & Code Assistance** | Pseudocode translation and TypeScript implementations for: (1) Banker's Safety Algorithm, (2) Banker's Resource-Request Protocol, (3) RAG Matrix Reduction ($O(m \cdot n^2)$), (4) Wait-For Graph DFS cycle detection, and (5) Havender linear ordering. | Manually verified all matrix algebra and vector operations against textbook formulas: $\text{Need} = \text{Max} - \text{Allocation}$, tentative state rollback logic, and state transition invariants. Confirmed zero state mutation on rejected or waiting requests. |
| **ChatGPT / Claude** | **Test-Case Generation & Debugging** | Test case structures for Scenarios A through F (TC1 to TC6), boundary condition checks (zero available, allocation > max, negative values), and regression test scripts. | Executed and validated all 24 automated unit tests using `tsx --test src/engine/engine.test.ts`. Confirmed 100% pass rate. Verified safe sequence $\langle P_1, P_3, P_4, P_0, P_2 \rangle$ by manual paper-and-pencil trace before deployment. |

---

## Student Verification & Integrity Confirmation

1. **Independent Correctness Check:** All algorithm results produced by the dashboard (including Need matrices, safe sequence order, Wait-For Graph cycles, and victim termination recovery) were independently calculated by hand using textbook procedures.
2. **State Distinction:** The team verified that the dashboard strictly treats `SAFE`, `UNSAFE`, `WAITING`, `DEADLOCK_DETECTED`, and `INVALID_INPUT` as distinct states, never confusing an unsafe state with an active deadlock, nor an unavailable request with an invalid one.
3. **Viva Preparedness:** Every team member is prepared to explain every line of algorithm code, justify test case results, and modify simulation parameters live during the laboratory demonstration.
