import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TrustAudit Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROJECT_ROOT: Path = BASE_DIR.parent
    
    # Persistence
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/trustaudit.db")
    
    # Blockchain / Ganache Configuration
    GANACHE_RPC_URL: str = os.getenv("GANACHE_RPC_URL", "http://127.0.0.1:8545")
    CHAIN_ID: int = int(os.getenv("CHAIN_ID", "1337"))
    DEPLOYMENT_MANIFEST_PATH: str = os.getenv(
        "DEPLOYMENT_MANIFEST_PATH",
        str(PROJECT_ROOT / "contracts" / "deployments" / "local-ganache.json")
    )
    
    # AI Oracle restricted private key (Ganache account #2 default or from env)
    # Never use in production; strictly for local Ganache demonstration
    ORACLE_PRIVATE_KEY: str = os.getenv(
        "ORACLE_PRIVATE_KEY",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    )
    
    # Security & Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "trustaudit-super-secure-local-jwt-secret-key-32bytes-min")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Model Artifacts
    MODEL_PATH: str = os.getenv(
        "MODEL_PATH",
        str(PROJECT_ROOT / "Ml Fraud Detection Models" / "my_fraud_detection_model.pkl")
    )
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
