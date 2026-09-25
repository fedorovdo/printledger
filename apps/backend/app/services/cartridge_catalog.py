from sqlalchemy import text
from sqlalchemy.orm import Session


CARTRIDGE_CATALOG_MUTATION_LOCK_KEY = 0x504C434D


def acquire_cartridge_catalog_mutation_lock(db: Session) -> None:
    """Serialize cartridge model mutations that depend on normalized uniqueness."""
    if db.get_bind().dialect.name != "postgresql":
        return
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {"lock_key": CARTRIDGE_CATALOG_MUTATION_LOCK_KEY},
    )
