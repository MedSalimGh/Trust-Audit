import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import SecurityHeadersMiddleware, setup_rate_limiting
from app.models.database import init_db
from app.api.v1 import (
    auth, transactions, cases, ai,
    audit, blockchain, executions
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("trustaudit.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TrustAudit Database...")
    init_db()
    logger.info("TrustAudit backend services initialized successfully.")
    yield
    logger.info("Shutting down TrustAudit backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Assisted, Blockchain-Backed Banking Transaction Audit & Multi-Signature Execution Gate API",
    lifespan=lifespan
)

# ─── Middleware Stack (order matters: last added = first executed) ─────────────

# 1. Security headers on every response
app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Rate limiting
setup_rate_limiting(app)

# ─── API Routers ──────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(blockchain.router, prefix=settings.API_V1_STR)
app.include_router(executions.router, prefix=settings.API_V1_STR)

# ─── Public Endpoints (no auth) ──────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "TrustAudit Core API",
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "sqlite_connected",
    }
