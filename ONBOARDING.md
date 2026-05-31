# AlgoStore DAA — New Developer Onboarding

---

## What Problem This Project Solves

**AlgoStore** is an image storage platform with intelligent deduplication. The core thesis is: before storing an uploaded image, the system should:

1. **Check for exact duplicates** via SHA-256 hash
2. **Check for near-duplicates** (same image, different crop/resize/quality) via perceptual hashing (pHash)
3. **Compress the image** using a custom JPEG-like algorithm (DCT + quantization + RLE + Huffman coding) before writing to object storage

This is a **Design and Analysis of Algorithms (DAA) coursework project** — the point is to implement these algorithms from scratch, not use library wrappers. The `pyproject.toml` description confirms: *"A image file uploading System with image deduplication."*

---

## A. High-Level Architecture Explanation

The intended architecture is a **microservice pipeline** with these tiers:

```
[Client / HTTP]
      │
      ▼
[FastAPI REST API]  ─── enqueues jobs ──►  [Celery Worker]
      │                                          │
      │                                    compress + hash
      │                                          │
      ▼                                          ▼
[PostgreSQL]  ◄─── metadata ────────────  [MinIO / S3]
(image records,                          (compressed .bin files)
 compression results)
      ▲
      │
[Redis]  (Celery broker — task queue between API and Worker)
```

The **separation of concerns** is:
- API receives the upload request and immediately returns a job ID
- The Celery worker does the heavy CPU work (compress, hash, upload to MinIO) asynchronously
- PostgreSQL stores metadata about every image and its compression stats
- MinIO (self-hosted S3-compatible object store) stores the actual compressed binary blobs
- Redis is purely a message broker between API and worker — no caching logic yet

**What's currently wired end-to-end:** The worker pipeline (compress → upload → DB write) runs correctly in isolation. The REST API layer is not yet connected to any of this.

---

## B. Folder-by-Folder Explanation

### `/app/` — Application root
The main package. Everything under here is production code (or production-intent code).

### `/app/api/` — FastAPI HTTP layer
The HTTP interface. Contains routes, request/response schemas, and dependency injection. **Currently partially broken** — `main.py` contains tutorial/placeholder code, and all route files (`routes/analysis.py`, `routes/images.py`, `routes/jobs.py`) and all schema files (`schemas/analysis.py`, `schemas/image.py`, `schemas/job.py`) are **empty stubs**.

### `/app/config/` — Application configuration
Pydantic Settings class that reads DB credentials from environment variables or a Docker secrets file. Mostly correct and production-ready.

### `/app/core/` — Algorithm implementations (the heart of the project)
The only folder where substantial algorithmic work has been done:
- `compression.py` — Full JPEG-like image compression
- `phash.py` — Perceptual hashing using DCT
- `exact_hash.py` — SHA-256 exact deduplication (stub — only has a comment)
- `similarity.py` — BK-Tree for fast nearest-hash search

### `/app/database/` — Data persistence layer
- `models.py` — SQLAlchemy ORM models (partially complete — comment block shows intended tables that aren't modelled yet)
- `connection.py` — DB engine and session factory
- `session.py` — Table creation script (run once to initialize DB)
- `base.py` — Empty stub
- `repositories/images.py`, `repositories/jobs.py`, `repositories/results.py` — All are **empty stubs with only comments**

### `/app/services/` — Business logic layer
- `upload_service.py` — Substantially complete: handles MinIO upload + DB record creation
- `analysis_service.py` — Empty stub
- `job_service.py` — Empty stub

### `/app/worker/` — Celery async task worker
- `celery_app.py` — Celery instance configuration (has a **bug** — see section E)
- `tasks.py` — The main Celery task for processing an image end-to-end

### `/app/utils/` — Shared data structures
- `heap.py` — Two separate MinHeap implementations (one clean, one older/less polished — both present)
- `rle.py` — Standalone RLE encoder/decoder functions
- `__init__.py` — Exports from both modules

### `/app/tests/` — Integration tests
Not unit tests — these are end-to-end integration tests that require all Docker services running.

### `/docker/` — Container orchestration
- `docker-compose.yml` — Defines PostgreSQL, Redis, and MinIO containers
- `api.Dockerfile`, `worker.Dockerfile` — **Both empty stubs** (no container images for the app itself yet)

### `/docs/` — Development notes and design docs
Weekly progress notes, algorithm documentation, and migration notes. These are developer journals, not formal docs.

### `/playground/` — Scratch scripts
Throwaway files for quick local experimentation. `test_phash.py` and `test_compression.py` are both empty.

### Root files
- `main.py` — Placeholder (`print("Hello from algostore!")`) — does nothing
- `healthcheck.py` — Useful script to verify all Docker services are up before testing
- `pyproject.toml` — Project metadata + all Python dependencies (managed with `uv`)
- `Algostore.code-workspace` — Empty VS Code workspace file

---

## C. File-by-File Explanation

| File | Status | Purpose |
|------|--------|---------|
| `main.py` | Placeholder | Entry point, currently just a hello-world stub |
| `healthcheck.py` | Complete | Checks Redis, MinIO, PostgreSQL, DB tables — run before tests |
| `pyproject.toml` | Complete | Python 3.13, all dependencies listed, uses `uv` for lockfile |
| `app/api/main.py` | Tutorial code | FastAPI app with fake demo routes (`/fakeDB`, `/nitems`, `MelodyCloud` copy-paste) |
| `app/api/config.py` | Empty | Should hold API-specific config |
| `app/api/deps.py` | Empty | Should hold FastAPI dependency injectors (e.g. `get_db()`) |
| `app/api/routes/analysis.py` | Empty | Should hold `/analysis/*` endpoints |
| `app/api/routes/images.py` | Empty | Should hold `/images/*` endpoints (upload, list, get) |
| `app/api/routes/jobs.py` | Empty | Should hold `/jobs/*` endpoints (status polling) |
| `app/api/schemas/analysis.py` | Empty | Pydantic response models for analysis results |
| `app/api/schemas/image.py` | Empty | Pydantic request/response models for images |
| `app/api/schemas/job.py` | Empty | Pydantic models for Celery job status |
| `app/config/config.py` | Functional | Pydantic `Settings` class with Postgres DSN builder and Docker secrets support |
| `app/core/compression.py` | **Complete** | Full JPEG-like pipeline: DCT + quantization + RLE + Huffman encode/decode |
| `app/core/phash.py` | **Complete** | DCT-based 64-bit perceptual hash; Hamming distance function |
| `app/core/exact_hash.py` | Empty stub | Should implement SHA-256 exact hash check |
| `app/core/similarity.py` | **Complete** | BK-Tree data structure with `add()` and `search()` using triangle inequality pruning |
| `app/database/models.py` | Partial | `Image` and `CompressionResult` ORM models done; `User` model uses wrong table name; `phash_results`, `similarity_results`, and `jobs` tables are only in comments |
| `app/database/connection.py` | Functional | Engine + session factory; has wrong default DB name (`ai_news_aggregator`) — copy-paste artifact |
| `app/database/session.py` | Functional | `Base.metadata.create_all()` script — run this once after starting Postgres |
| `app/database/base.py` | Empty | Should export the `Base` declarative base (currently imported from `models.py` directly) |
| `app/database/setup.md` | Complete | Manual psql instructions for creating the DB user and database |
| `app/database/repositories/images.py` | Empty stub | Should have CRUD functions for the `images` table |
| `app/database/repositories/jobs.py` | Empty stub | Should have CRUD functions for Celery job records |
| `app/database/repositories/results.py` | Empty stub | Should have CRUD for compression/phash result records |
| `app/services/upload_service.py` | **Complete** | `Upload` class: connects to MinIO, uploads file, writes `Image` + `CompressionResult` rows |
| `app/services/analysis_service.py` | Empty | Should orchestrate phash lookup and deduplication logic |
| `app/services/job_service.py` | Empty | Should manage Celery job creation and status tracking |
| `app/worker/celery_app.py` | **Has bug** | Creates Celery app but uses `http://` URL instead of `redis://` — broker URL is wrong |
| `app/worker/tasks.py` | **Functional** | `process_compressed_image` task: compress per-channel → pickle → upload to MinIO |
| `app/utils/heap.py` | Complete (duplicated) | `MinHeap` (clean, used by Huffman) + older `Heap` class + standalone heap functions |
| `app/utils/rle.py` | Complete | Standalone `rle_encode`/`rle_decode` (not used by `compression.py` — it has its own inline RLE) |
| `app/utils/__init__.py` | Complete | Exports heap and RLE utilities |
| `app/tests/test_compression.py` | **Functional** | Manual test: compresses a color image, saves result, shows side-by-side (requires `assets/test.png`) |
| `app/tests/test_minio.py` | **Functional** | Quick MinIO connectivity smoke test |
| `app/tests/test_pipeline.py` | **Partially broken** | Integration test suite — imports `retrieval_service.Retrieval` which does not exist |
| `app/tests/test_redis_connection.py` | **Functional** | Quick Redis ping test |
| `docker/docker-compose.yml` | **Complete** | Postgres 15, Redis 7, MinIO with volumes and healthchecks |
| `docker/api.Dockerfile` | Empty | No API container image yet |
| `docker/worker.Dockerfile` | Empty | No worker container image yet |
| `docs/compression-migration.md` | Complete | 24-point technical notes on the JPEG-style compression refactor |
| `docs/week-1.md` — `docs/week-3.md` | Developer notes | Progress journals: Docker setup, Postgres, algorithm docs |

---

## D. Data Flow Diagram (text format)

### Intended upload flow (not fully wired yet)

```
User POSTs image to POST /images/upload
            │
            ▼
     FastAPI Route (images.py)  ← NOT WRITTEN YET
            │
            │  1. Read file bytes
            │  2. Compute SHA-256
            │  3. Check DB: does sha256 already exist?
            │       YES → return existing image_id (exact duplicate)
            │       NO  → continue
            │
            ▼
   Enqueue Celery task via Redis
            │
            ▼
    Redis broker (port 6379)
            │
            ▼
    Celery Worker picks up task
            │
    worker/tasks.py :: process_compressed_image()
            │
            │  1. cv2.imread() the image file
            │  2. compute_phash() → 16-char hex string
            │  3. cv2.split() → [B channel, G channel, R channel]
            │  4. For each channel:
            │       a. dct_quantize_image() → 8x8 block DCT + quantize
            │       b. rle_encode() → run-length encode quantized values
            │       c. huffman_encode() → build frequency table, build tree
            │       d. emit bitstream
            │  5. pickle.dump([B_data, G_data, R_data]) → .bin file
            │  6. Upload() → boto3 PUT to MinIO (port 9000)
            │  7. Write Image row + CompressionResult row to PostgreSQL
            │
            ▼
     Return job result dict
            │
            ▼
   (Intended) API polls job status → returns image_id to client
```

### BK-Tree similarity search flow (in-memory, not yet connected to API)

```
At startup (intended): load all pHashes from DB → build BKTree in memory
            │
User queries GET /analysis/similar?image_id=X
            │
            ▼
  BKTree.search(query_phash, max_distance=10)
            │
  Uses triangle inequality:
  for each candidate node:
    compute hamming_distance(query_phash, node.phash)
    prune children outside [dist-threshold, dist+threshold]
            │
            ▼
  Returns list of (distance, phash, image_id) sorted by distance
```

### Compression algorithm deep dive

```
Input: 2D numpy array (single channel, uint8)
            │
            ▼
DCT quantize (dct_quantize_image):
  Pad to multiple of 8
  For each 8×8 block:
    shift pixel values by -128
    apply 2D DCT (separable, orthonormal)
    divide by 8×8 quantization matrix × q_factor
    round to int16
            │
            ▼
RLE encode (Huffman.rle_encode):
  Flatten quantized array row-by-row
  Encode as [(value, count), (value, count), ...]
            │
            ▼
Huffman encode (Huffman.huffman_encode):
  Count frequency of each (value, count) tuple
  Build MinHeap of HuffmanNodes
  Merge lowest-frequency pairs until single root
  Walk tree to assign bit codes
            │
            ▼
Output: (bitstream: str, code_to_symbol: dict, meta: dict)
  bitstream = "0110101..." (concatenated codes for each RLE tuple)
  meta = {orig_shape, padded_shape, q_factor}
```

---

## E. Current Project Progress Assessment

### Overall: ~30% complete

---

### What is Complete and Working

| Component | Completeness | Notes |
|-----------|-------------|-------|
| DCT + Quantization (JPEG-style) | ~95% | Working, well-tested |
| Huffman encoding/decoding | ~90% | Working, MinHeap-backed |
| RLE encoding (standalone + in-compression) | 100% | Both implementations work |
| pHash computation | 100% | Clean DCT-based 64-bit hash |
| Hamming distance calculation | 100% | |
| BK-Tree (similarity search) | 95% | Correct, but exists only in memory |
| MinIO upload service | 90% | Functional, credentials hardcoded |
| Celery task (`process_compressed_image`) | 85% | Logic correct, broker URL is broken |
| PostgreSQL ORM models (Image, CompressionResult) | 80% | Usable, missing 3 tables |
| Docker compose (Postgres, Redis, MinIO) | 100% | Ready to use |
| `healthcheck.py` | 100% | Useful but has wrong table name checks |

---

### What is Incomplete or Broken

#### Critical Bugs

**1. Wrong Celery broker URL scheme** — `app/worker/celery_app.py`, line 7:
```python
# CURRENT (broken):
REDIS_URL = f"http://localhost:{os.getenv("REDIS_PORT")}"

# CORRECT:
REDIS_URL = f"redis://localhost:{os.getenv('REDIS_PORT', '6379')}"
```
Celery requires the `redis://` scheme. This means the Celery worker cannot connect to its broker at all.

---

**2. Import of non-existent module** — `app/tests/test_pipeline.py`, line 19:
```python
from app.services.retrieval_service import Retrieval  # file does not exist
```
`retrieval_service.py` was never created. The entire integration test will crash at import time.

---

**3. Wrong default database name** — `app/database/connection.py`, line 13:
```python
# CURRENT (copy-paste artifact from another project):
db = os.getenv("POSTGRES_DB", "ai_news_aggregator")

# CORRECT default (matches docker-compose.yml):
db = os.getenv("POSTGRES_DB", "postgres-algostore-daa")
```

---

**4. Wrong table names in healthcheck** — `healthcheck.py`, lines 58–59:
```python
# CURRENT (wrong — these quoted names don't match the ORM __tablename__):
conn.execute(text('SELECT 1 FROM "Image" LIMIT 1'))
conn.execute(text('SELECT 1 FROM "CompressionResult" LIMIT 1'))

# CORRECT (matching models.py __tablename__ values):
conn.execute(text('SELECT 1 FROM images LIMIT 1'))
conn.execute(text('SELECT 1 FROM compression_results LIMIT 1'))
```

---

**5. Invalid table name with space** — `app/database/models.py`, line 9:
```python
# CURRENT (space in name causes SQL quoting issues everywhere):
__tablename__ = "User profile"

# CORRECT:
__tablename__ = "users"
```

---

#### Structural Gaps (not started)

| What's Missing | Where it Should Go |
|----------------|--------------------|
| `exact_hash.py` implementation (SHA-256 dedup check) | `app/core/exact_hash.py` |
| `retrieval_service.py` (download + decompress from MinIO) | `app/services/retrieval_service.py` |
| `analysis_service.py` (orchestrate pHash + BKTree lookup) | `app/services/analysis_service.py` |
| `job_service.py` (create/track Celery jobs) | `app/services/job_service.py` |
| All 3 route files (images, jobs, analysis) | `app/api/routes/` |
| All 3 schema files (image, job, analysis) | `app/api/schemas/` |
| All 3 repository files (images, jobs, results) | `app/database/repositories/` |
| DB models for: `phash_results`, `similarity_results`, `jobs` | `app/database/models.py` |
| Dockerfiles for API and worker | `docker/api.Dockerfile`, `docker/worker.Dockerfile` |
| BKTree persistence (load from DB at startup) | Should be in `analysis_service` or a startup event |
| `.env` file (`.env.example` is currently empty) | Root `.env` |
| `assets/` directory with test images | `assets/test.png` needed for `test_compression.py` |

---

#### Design Notes / Decisions to Be Aware Of

**Two RLE implementations exist.** `app/utils/rle.py` has standalone functions, but `compression.py` has its own inline `Huffman.rle_encode()`. They work identically but one is redundant. The utils version is not imported by the compression pipeline.

**Two Heap implementations exist.** `heap.py` has `MinHeap` (the clean class, used by Huffman) and an older `Heap` class with free functions. The old implementation is not used anywhere and could be removed.

**Compression stores a pickle, not a real image.** The worker task compresses each channel and pickles the result to a `.bin` file, then stores that in MinIO. There is no way to display these files directly — you need `decompress_image()` first. This is by design for the algorithm demo, but means stored files are opaque blobs.

**Credentials are hardcoded.** MinIO credentials (`minioadmin` / `daa-storages`) are hardcoded in `upload_service.py`, `test_minio.py`, and `healthcheck.py`. They should come from `.env`. The `.env.example` is empty — this needs to be filled in before the project can run from a fresh clone.

**BKTree is ephemeral.** `similarity.py` implements a correct BK-Tree, but there is no code that builds it from the database at startup or adds entries when new images are uploaded. It exists only as a standalone data structure with no persistence bridge.

**`app/api/main.py` contains unrelated tutorial code.** It references `"MelodyCloud"` (a different project), has a fake items database, and dummy PUT/GET endpoints. This file needs to be rewritten to register the actual route modules.

---

### Recommended First Steps for a New Developer

Follow these steps in order after cloning:

1. **Fix the broker URL bug** in `app/worker/celery_app.py` — change `http://` to `redis://`
2. **Create `.env`** with correct Postgres and Redis credentials matching `docker/docker-compose.yml`
3. **Start Docker services**: `docker-compose -f docker/docker-compose.yml up -d`
4. **Initialize DB**: `python app/database/session.py`
5. **Run healthcheck**: `python healthcheck.py`
6. **Create `retrieval_service.py`** — the end-to-end test depends on it
7. **Write the DB repository layer** — the API needs thin data-access wrappers around SQLAlchemy queries
8. **Wire up the FastAPI routes** — replace `app/api/main.py` with real router registration and implement the empty route files
