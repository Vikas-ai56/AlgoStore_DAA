import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import images, jobs, analysis

app = FastAPI(
    title="AlgoStore",
    description="DCT+Huffman image compression profiler API",
    version="0.1.0",
)

# CORS: only needed when the frontend is served from a different origin than
# the API.  In dev the Vite proxy handles this, but it's harmless to include.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images.router)
app.include_router(jobs.router)
app.include_router(analysis.router)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    t = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - t:.4f}s"
    return response


@app.get("/")
async def root():
    return {
        "service": "AlgoStore",
        "endpoints": {
            "upload": "POST /profiler/upload",
            "poll":   "GET  /jobs/{task_id}",
            "sync_compress": "POST /analysis/compress",
            "phash_debug":   "POST /analysis/phash",
            "docs":   "/docs",
        },
    }
