# Vibe — Modern Short-Form Video Social Media Platform

A **production-ready**, full-stack short-form video social media platform built with modern architecture.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)             │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴────────────┐
       │                        │
┌──────▼──────┐         ┌───────▼──────┐
│  Frontend   │         │   Backend    │
│  React 18   │         │  Express+TS  │
│  Vite+TW    │         │  + Socket.IO │
└─────────────┘         └──────┬───────┘
                               │
         ┌─────────────────────┼──────────────────────┐
         │                     │                      │
  ┌──────▼──────┐    ┌─────────▼───────┐    ┌────────▼──────┐
  │ PostgreSQL  │    │  Redis (Cache)  │    │    MinIO/S3   │
  │  + Prisma   │    │  + Pub/Sub      │    │  (Videos)     │
  └─────────────┘    └─────────────────┘    └───────────────┘
         │
  ┌──────▼──────────────────────────────────┐
  │  BullMQ Workers                         │
  │  - Video Processor (FFmpeg transcode)   │
  │  - Feed Generator (fan-out)             │
  └─────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **State** | Zustand + React Query |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache** | Redis (ioredis) |
| **Queue** | BullMQ |
| **Storage** | MinIO (dev) / AWS S3 (prod) |
| **Real-time** | Socket.IO + Redis adapter |
| **Video** | FFmpeg — HLS multi-bitrate (360p/480p/720p/1080p) |
| **Search** | PostgreSQL full-text (dev) / Elasticsearch (prod) |

---

## 🚀 Quick Start

### Option 1 — Docker (Recommended)

```bash
# 1. Setup environment
make env       # Creates backend/.env from template
# Edit backend/.env with your settings

# 2. Start everything
make docker-up

# 3. (Optional) Seed demo data  
make seed
```

The platform will be live at:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **MinIO Console**: http://localhost:9001

### Option 2 — Local Development

```bash
# Prerequisites: Node 20+, PostgreSQL, Redis, FFmpeg

# 1. Install deps
npm install

# 2. Configure env
make env
# Edit backend/.env — set DATABASE_URL, REDIS_URL, etc.

# 3. Run migrations
make migrate-dev

# 4. Seed database
make seed

# 5. Start dev servers
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

---

## 📂 Project Structure

```
tiktok-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # 17 database models
│   │   └── seed.ts               # Demo data seeder
│   └── src/
│       ├── app.ts                # Express app setup
│       ├── server.ts             # Entry point
│       ├── config/               # DB, Redis, Storage, Socket.IO
│       ├── middleware/           # Auth, Upload, Rate limiting, Errors
│       ├── routes/               # All API routes (10 routers)
│       ├── services/             # Business logic (8 services)
│       └── workers/              # BullMQ background workers
├── frontend/
│   └── src/
│       ├── components/           # React components by page
│       ├── context/              # Zustand stores
│       ├── hooks/                # Custom hooks
│       ├── services/             # API client
│       └── utils/                # Formatters
└── infrastructure/
    ├── docker/                   # Dockerfiles + docker-compose
    └── nginx/                    # Nginx configs
```

---

## 🔌 API Endpoints

| Resource | Endpoints |
|----------|-----------|
| **Auth** | `POST /api/users/register` `POST /api/users/login` `POST /api/users/logout` `POST /api/users/refresh` |
| **Users** | `GET /api/users/:username` `PATCH /api/users/me` `POST /api/users/me/avatar` |
| **Videos** | `POST /api/videos` `GET /api/videos/:id` `DELETE /api/videos/:id` `POST /api/videos/:id/like` |
| **Feed** | `GET /api/feed/foryou` `GET /api/feed/following` `GET /api/feed/discover` |
| **Social** | Follow, Comments, Likes, Shares |
| **Search** | `GET /api/search?q=&type=` with autocomplete and trending |
| **Messages** | Conversations, threads, read receipts |
| **Notifications** | Real-time via Socket.IO |
| **Analytics** | Creator dashboard, view tracking |
| **Moderation** | Report content, admin review |

---

## ⚙️ Key Features

### Video Pipeline
1. User uploads → stored in S3/MinIO
2. BullMQ queues transcoding job
3. FFmpeg transcodes to **360p / 480p / 720p / 1080p**
4. Thumbnail generated at 10% of video duration
5. All versions uploaded to S3
6. Video marked `ACTIVE` and distributed to feeds

### Feed Algorithm (For You Page)
- **Engagement score**: `views×0.1 + likes×0.3 + comments×0.3 + shares×0.3`
- **Time decay**: `score × e^(-0.1 × hoursOld)`
- **Interest matching**: user interest vector from watch history
- **Diversity**: max 2 consecutive videos from same creator
- **Fan-out**: push to followers if <10K (pull for celebrities)

### Real-time
- Socket.IO with Redis adapter for horizontal scaling
- Live messaging, typing indicators, presence
- Push notifications via WebSocket

---

## 🔒 Security
- JWT access tokens (15min) + refresh tokens (7d, rotated)
- Redis token revocation
- Redis sliding window rate limiting
- Helmet.js security headers
- CORS, bcrypt password hashing (salt=12)
- Role-based access (USER/CREATOR/MODERATOR/ADMIN)

---

## 📋 Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `S3_ENDPOINT` | MinIO/S3 endpoint |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |

---

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 3000 | API server |
| `frontend` | 5173 | React app |
| `postgres` | 5432 | Database |
| `redis` | 6379 | Cache + queues |
| `minio` | 9000/9001 | Object storage |
| `kafka` | 9092 | Event streaming |
| `nginx` | 80 | Reverse proxy |

---

## 📦 Deploy to Production

1. Set `NODE_ENV=production` 
2. Replace MinIO with AWS S3 (set `S3_ENDPOINT=` empty)
3. Use a managed PostgreSQL (e.g. RDS, Supabase)
4. Use a managed Redis (e.g. Upstash, ElastiCache)
5. Build Docker images and push to registry
6. Deploy with Kubernetes or ECS using the included configs

```bash
docker build -f infrastructure/docker/Dockerfile.backend -t tiktok-backend backend/
docker build -f infrastructure/docker/Dockerfile.frontend -t tiktok-frontend frontend/
```
