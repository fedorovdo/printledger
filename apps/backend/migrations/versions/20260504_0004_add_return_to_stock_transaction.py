"""add return to stock transaction type

Revision ID: 20260504_0004
Revises: 20260504_0003
Create Date: 2026-05-04 23:20:00.000000

"""
from collections.abc import Sequence

from alembic import op


revision: str = "20260504_0004"
down_revision: str | None = "20260504_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


TRANSACTION_TYPES = (
    "stock_in_new",
    "stock_in_refilled",
    "correction_plus",
    "correction_minus",
    "install",
    "remove",
    "return_to_stock",
    "send_to_refill",
    "receive_from_refill",
    "write_off",
)

OLD_TRANSACTION_TYPES = tuple(
    transaction_type
    for transaction_type in TRANSACTION_TYPES
    if transaction_type != "return_to_stock"
)


def _transaction_type_constraint(values: tuple[str, ...]) -> str:
    allowed_values = ", ".join(f"'{value}'" for value in values)
    return f"transaction_type IN ({allowed_values})"


def upgrade() -> None:
    op.execute(
        "ALTER TABLE cartridge_inventory_transactions "
        "DROP CONSTRAINT IF EXISTS cartridgetransactiontype"
    )
    op.create_check_constraint(
        "cartridgetransactiontype",
        "cartridge_inventory_transactions",
        _transaction_type_constraint(TRANSACTION_TYPES),
    )


def downgrade() -> None:
    op.execute(
        "UPDATE cartridge_inventory_transactions "
        "SET transaction_type = 'correction_plus', "
        "reason = COALESCE(reason, 'return_to_stock_after_remove') "
        "WHERE transaction_type = 'return_to_stock'"
    )
    op.execute(
        "ALTER TABLE cartridge_inventory_transactions "
        "DROP CONSTRAINT IF EXISTS cartridgetransactiontype"
    )
    op.create_check_constraint(
        "cartridgetransactiontype",
        "cartridge_inventory_transactions",
        _transaction_type_constraint(OLD_TRANSACTION_TYPES),
    )
