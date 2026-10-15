# Architecture Decision Record (ADR)

## 1. Mobile Technology
**Decision:** Flutter + Dart
**Reasoning:**
*   **Performance:** Flutter compiles to native ARM code, offering predictable 60fps/120fps scrolling which is absolutely critical for a vertical video feed.
*   **UI Customization:** Provides a highly flexible canvas for custom animations (heart pops, music disc spins) without relying on OEM UI constraints.
*   **Cross-Platform:** Single codebase for Android (Google Play) and iOS (App Store), drastically reducing engineering overhead for MVP.

## 2. Backend Technology
**Decision:** Node.js (TypeScript) + Express + Prisma ORM + PostgreSQL
**Reasoning:**
*   **Firebase Rejected:** While many open-source clones use Firebase, it lacks the relational querying needed for complex social graphs (followers, likes, hashtags) and becomes cost-prohibitive for high-bandwidth video serving.
*   **PostgreSQL:** Excellent for relational social data.
*   **Node.js/TypeScript:** Shares language context with our web admin dashboard. Highly scalable for I/O bound tasks (API routing).

## 3. Media Pipeline & Storage
**Decision:** MinIO (S3 Compatible) + FFmpeg + Redis/BullMQ Workers
**Reasoning:**
*   **Storage:** Storing videos directly in the database is an anti-pattern. We will use MinIO locally for development and AWS S3 / Cloudflare R2 in production for cost-effective object storage.
*   **Processing:** Uploaded videos must be converted to standard web-friendly formats (H.264/MP4) with multiple resolutions. Node.js will offload this heavy CPU task to background workers (using BullMQ backed by Redis) running FFmpeg, ensuring the main API thread is never blocked.

## 4. State Management (Mobile)
**Decision:** Riverpod
**Reasoning:**
*   Compile-safe, scalable, and highly testable state management. We reject `GetX` (commonly found in tutorials) due to its heavy reliance on global singletons and untestable side-effects which hinder long-term enterprise maintenance.

## 5. Caching and Real-Time
**Decision:** Redis + Socket.IO
**Reasoning:**
*   **Redis:** Crucial for rate-limiting, caching feed queues, and managing typing indicators/online presence.
*   **Socket.IO:** Will handle real-time notifications and direct messaging.
