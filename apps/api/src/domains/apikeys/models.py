import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from src.core.db import Base
from src.core.repository import TenantOwnedMixin

# Keys look like pgda_<16-char-id><32-char-secret>; the id part is stored in
# the clear for identification, the full key only as a SHA-256 hash.
KEY_PREFIX = "pgda_"
KEY_ID_CHARS = 16
KEY_SECRET_CHARS = 32


class ApiKey(TenantOwnedMixin, Base):
    """A workspace API key for programmatic access.

    Only the SHA-256 hash of the full key is stored — a database leak does
    not leak usable keys. The full key is shown exactly once, at creation.
    """

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    # The `pgda_` + id prefix, e.g. pgda_9f2b7c1d — lets support identify
    # a key from a customer's truncated paste without revealing it.
    prefix: Mapped[str] = mapped_column(String(32))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_api_keys_tenant_name"),)
