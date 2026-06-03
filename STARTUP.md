# AlgoStore DAA — Startup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | ≥ 3.12 | `pyenv install 3.13` or system package |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker + Compose | v2+ | [docker.com](https://docker.com) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |

---

## First-Time Setup

Run this once after cloning.

```bash
# 1. Install Python dependencies
uv sync

# 2. Create .env (values match docker/docker-compose.yml)
cat > .env << 'EOF'
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=vikas
POSTGRES_PASSWORD=letmein
POSTGRES_DB=postgres-algostore-daa
REDIS_PORT=6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=daa-storages
EOF

# 3. Start infrastructure (Postgres, Redis, MinIO)
docker compose -f docker/docker-compose.yml up -d

# 4. Wait ~15 s for health checks, then verify
python healthcheck.py

# 5. Create database tables (run once; idempotent)
python app/database/session.py

# 6. Install frontend dependencies
cd frontend && npm install && cd ..
```

---

## Daily Startup

Every session needs four processes. Open four terminals.

### Terminal 1 — Infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

Verify with `docker compose -f docker/docker-compose.yml ps` — all three containers should show `(healthy)`.

### Terminal 2 — FastAPI backend

```bash
uv run uvicorn app.api.main:app --reload --port 8000
```

API is ready when you see `Application startup complete`.

### Terminal 3 — Celery worker

```bash
uv run celery -A app.worker worker --loglevel=info
```

Required for `POST /profiler/upload` (async compression jobs). Not needed for `POST /analysis/compress` (sync mode).

### Terminal 4 — Frontend

```bash
cd frontend && npm run dev
```

Vite dev server starts at `http://localhost:5173`.

---

## Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5173 | Vite dev server |
| Backend API | http://localhost:8000 | FastAPI |
| API docs (Swagger) | http://localhost:8000/docs | Interactive API explorer |
| MinIO console | http://localhost:9001 | Login: `minioadmin` / `daa-storages` |
| PostgreSQL | `localhost:5432` | DB: `postgres-algostore-daa`, user: `vikas` |
| Redis | `localhost:6379` | Celery broker |

---

## Key API Endpoints

```
POST /profiler/upload          — Upload image; returns Celery task_id (async)
GET  /jobs/{task_id}           — Poll job status + compression result
POST /analysis/compress        — Compress image inline, return all step data (sync)
POST /analysis/phash           — Compute pHash for an uploaded image
GET  /docs                     — Swagger UI
```

---

## Shutdown

```bash
# Stop Docker services (keeps data in volumes)
docker compose -f docker/docker-compose.yml down

# Stop and wipe all persisted data (Postgres + MinIO volumes)
docker compose -f docker/docker-compose.yml down -v
```

---

## Troubleshooting

**`healthcheck.py` fails on DB tables**
Run `python app/database/session.py` — tables may not have been created yet.

**`celery worker` exits immediately / can't connect to broker**
Check that Redis container is healthy: `docker compose -f docker/docker-compose.yml ps redis`

**Frontend shows no data / network errors**
Confirm the backend is running on port 8000 and CORS is not blocked. Check the browser console.

**`uv run` can't find a module**
Run `uv sync` — a new dependency may have been added.

**MinIO bucket missing**
The `Upload` service auto-creates `main-bucket` on first upload. If it's missing, trigger any upload or run `python app/tests/test_minio.py`.

**Port already in use**
```bash
# Find what's using port 8000
lsof -i :8000
# or
fuser 8000/tcp
```
