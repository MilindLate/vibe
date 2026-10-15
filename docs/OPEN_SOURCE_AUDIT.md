# Open Source Architecture Audit

**Date:** 2026-10-08
**Phase:** 0 (Research)
**Objective:** Evaluate existing open-source short-video platforms to select a foundation for a production-ready, scalable mobile application.

## 1. Candidate Evaluation

### A. RivaanRanawat / tiktok-flutter-clone
*   **Repository:** `https://github.com/RivaanRanawat/tiktok-flutter-clone`
*   **Ecosystem:** Flutter (Mobile)
*   **Architecture:** MVC-ish with GetX for state management.
*   **Backend:** Firebase (Firestore, Firebase Auth, Firebase Storage).
*   **Media Pipeline:** Direct client-side upload to Firebase Storage (no transcoding, no CDN optimization, no HLS/DASH streaming).
*   **Pros:** Excellent UI replication of TikTok's core video feed; smooth vertical scrolling implementation; basic upload UI is ready.
*   **Cons:** Tightly coupled to Firebase (unsuitable for our custom scalable backend requirement); uses GetX (often discouraged in enterprise apps in favor of Riverpod/BLoC); lacks an actual recommendation engine (just chronological/random fetch); no media processing pipeline.
*   **Verdict:** **Extract UI/UX Patterns only.** The data layer and architecture must be completely discarded.

### B. sprksocial / client (Spark Social)
*   **Repository:** `https://github.com/sprksocial/client`
*   **Ecosystem:** Flutter
*   **Architecture:** Domain-Driven Design (DDD) inspired.
*   **Backend:** Custom API.
*   **Pros:** Much closer to production-ready architecture. Handles networking, caching, and state management more robustly than tutorial clones.
*   **Cons:** Heavy dependency on their specific backend architecture; might be overkill or divergent from the specific short-video swipe interface we need.
*   **Verdict:** **Reference for Architecture.** Good reference for how to structure a Flutter app talking to a custom social backend.

### C. kirkwat / tiktok & chinmayjoshi03 / tiktok-clone
*   **Ecosystem:** React Native
*   **Backend:** AWS Amplify / Firebase.
*   **Pros:** Good reference for React Native implementations.
*   **Cons:** We have actively decided to prefer **Flutter + Dart** for superior cross-platform rendering performance on mid-range Android devices, which is critical for a smooth video feed. React Native video bridges can sometimes introduce frame drops on older Android hardware.
*   **Verdict:** **Discard.** We are committing to Flutter.

### D. callmeahmadnasir-ops / tiktok-clone-app
*   **Ecosystem:** Full-stack (often Node/Mongo or similar)
*   **Pros:** Shows a custom backend approach.
*   **Cons:** Often lacks the robust Kafka/S3/Postgres microservice boundaries required for a true media pipeline.

---

## 2. Architectural Decision & Foundation Strategy

After reviewing the available open-source foundations, it is clear that **no single repository is 100% production-ready for our specific scalability requirements**, particularly regarding the media processing pipeline and recommendation engine.

However, we will adhere to the core principle of **not reinventing the wheel**:

1.  **Mobile Client (Flutter):** 
    *   We will adopt a **Clean Architecture** (Presentation, Domain, Data) using **Riverpod** for state management.
    *   We will extract the `PageView.builder` video scrolling mechanics and UI layout mathematics from repositories like `RivaanRanawat/tiktok-flutter-clone` (respecting MIT licenses) but rewrite the data-binding to use Riverpod and our custom REST API.
    *   We will use `video_player` with optimized caching layers (e.g., `cached_video_player` or natively bridging to ExoPlayer/AVPlayer caching).

2.  **Backend Services (Node.js + PostgreSQL + MinIO/S3):**
    *   *Note: We have already begun laying the groundwork for a Node.js + Prisma + PostgreSQL + Redis backend in this repository.*
    *   This is the correct path. Firebase (used by most clones) becomes prohibitively expensive at scale for video platforms due to egress costs and lacks custom ML-recommendation hooks.
    *   We will use **Kafka/Redis** for background video processing (FFmpeg transcoding).
    *   We will use **MinIO/S3** for storage, fronted by a CDN.

3.  **Recommendation Engine:**
    *   We will build a custom Python/FastAPI or Node-based service (Phase 7) that consumes Kafka event streams (watch time, likes, skips).

## 3. Reusability Plan

| Component | Source / Strategy | Action |
| :--- | :--- | :--- |
| **Feed UI** | `RivaanRanawat/tiktok-flutter-clone` | Adapt the `PageView` layout and overlay UI. Replace GetX with Riverpod. |
| **State Mgmt** | Custom (Riverpod) | Build from scratch for clean separation of concerns. |
| **API Backend** | Custom (Node.js/Prisma) | Continue current implementation. Avoid Firebase. |
| **Transcoding** | FFmpeg via BullMQ/Kafka | Implement scalable worker pattern. |
| **Video Caching** | Flutter packages | Integrate a flutter cache manager to prevent re-downloading videos. |

## 4. Next Steps (Phase 1)
1. Initialize the Flutter mobile application in `apps/mobile`.
2. Define the Clean Architecture folder structure.
3. Establish the base API client connecting the Flutter app to our local Node.js backend.
