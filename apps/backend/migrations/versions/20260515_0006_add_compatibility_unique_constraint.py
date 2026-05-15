"""add compatibility unique constraint

Revision ID: 20260515_0006
Revises: 20260514_0005
Create Date: 2026-05-15 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260515_0006"
down_revision: str | None = "20260514_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_pmcc_printer_model_cartridge_model",
        "printer_model_compatible_cartridges",
        ["printer_model_id", "cartridge_model_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_pmcc_printer_model_cartridge_model",
        "printer_model_compatible_cartridges",
        type_="unique",
    )
