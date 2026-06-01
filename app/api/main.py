from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import images, jobs, analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing blocking yet (BKTree rehydration will go here in Phase 3)
    yield
    # Shutdown cleanup placeholder


app = FastAPI(
    title="AlgoStore DAA",
    description="Image compression pipeline — DCT + RLE + Huffman, pHash, BKTree similarity, MinIO storage.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(jobs.router,   prefix="/api/jobs",   tags=["jobs"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])


@app.get("/", tags=["health"])
async def root():
    return {
        "project": "AlgoStore DAA",
        "description": "Custom image compression (DCT+RLE+Huffman) with MinIO storage, pHash similarity, and real-time Celery pipeline.",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
