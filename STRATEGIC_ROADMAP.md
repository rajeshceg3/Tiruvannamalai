# STRATEGIC ROADMAP: PROJECT SACRED STEPS

**Mission:** Elevate Repository to Production-Grade Standards
**Author:** Lead Engineer (NAVY Seal Unit)
**Date:** [Current Date]

## 1. Situation Analysis
The current repository represents a functional MVP for a spiritual journey tracking application. While core features (authentication, shrine tracking, journaling) are operational, the codebase lacks the robustness, observability, and defensive depth required for a high-stakes production environment.

**Current Status:**
-   **Security:** Basic protections (Helmet, Auth Rate Limit) are in place but narrow in scope.
-   **Reliability:** Single points of failure exist (e.g., lack of global error boundaries).
-   **Scalability:** Limited by in-memory session handling (in dev) and lack of caching.
-   **UX:** Good visual foundation but lacks resilience against failures.

## 2. Strategic Objectives
1.  **Zero-Downtime Reliability:** Ensure the application degrades gracefully and recovers from errors.
2.  **Ironclad Security:** Expand defense-in-depth to all API endpoints.
3.  **Total Observability:** Transform opaque logs into actionable, structured data.
4.  **Seamless User Experience:** Eliminate "white screen" crashes and provide instant feedback.

## 3. Implementation Plan

### Phase I: Immediate Fortification (Priority: Critical)
*   **Tactical Action 1: Universal Rate Limiting**
    *   *Rationale:* Currently, only auth routes are rate-limited. Authenticated users (or compromised accounts) could spam `/api/visits`.
    *   *Execution:* Apply a global API rate limiter to `/api/*`.
*   **Tactical Action 2: Frontend Resilience (Error Boundary)**
    *   *Rationale:* A React rendering error currently crashes the entire app.
    *   *Execution:* Implement a `GlobalError` component and wrap the app root.

### Phase II: Operational Intelligence (Priority: High)
*   **Tactical Action 3: Structured Logging**
    *   *Rationale:* Text-based logs are unparsable at scale.
    *   *Execution:* Refactor `server/index.ts` logger to output JSON in production (Severity, Timestamp, RequestID, Duration).

### Phase III: UX & Performance (Priority: Medium)
*   **Tactical Action 4: Optimistic Updates**
    *   *Rationale:* Journal updates await server response, creating friction.
    *   *Execution:* Use React Query `onMutate` for instant UI feedback.
*   **Tactical Action 5: Code Quality Verification**
    *   *Execution:* Expand test suite to cover new components.

## 4. Execution Protocol
This roadmap will be executed immediately, starting with Phase I. Verification will follow each step.

**Signed,**
*Lead Engineer*
