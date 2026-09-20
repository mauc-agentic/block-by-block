from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    """Configuración del backend desde variables de entorno."""

    # Supabase / PostgreSQL
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_db_url: str = os.getenv(
        "SUPABASE_DB_URL",
        "postgresql://postgres:postgres@localhost:5432/block_by_block"
    )

    # Auth
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_hours: int = 24

    # Server
    port: int = int(os.getenv("PORT", 8000))

    # Blockchain (HSK Chain testnet)
    hsk_rpc_url: str = os.getenv("HSK_RPC_URL", "https://testnet.hsk.xyz")
    hsk_chain_id: int = int(os.getenv("HSK_CHAIN_ID", 133))
    cause_vault_address: str = os.getenv("CAUSE_VAULT_ADDRESS", "0x")
    agent_address: str = os.getenv("AGENT_ADDRESS", "0x")
    agent_private_key: str = os.getenv("AGENT_PRIVATE_KEY", "0x")

    # OpenRouter
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "sk-")
    openrouter_url: str = os.getenv(
        "OPENROUTER_URL",
        "https://openrouter.ai/api/v1/messages"
    )

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8000"

    def get_allowed_origins(self) -> list:
        """Parse CORS origins from comma-separated string."""
        if isinstance(self.allowed_origins, list):
            return self.allowed_origins
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignora campos extra en .env

@lru_cache()
def get_settings():
    return Settings()
