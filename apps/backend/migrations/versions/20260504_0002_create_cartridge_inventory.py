"""create cartridge inventory tables

Revision ID: 20260504_0002
Revises: 20260504_0001
Create Date: 2026-05-04 21:05:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260504_0002"
down_revision: str | None = "20260504_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


cartridge_transaction_type = sa.Enum(
    "stock_in_new",
    "stock_in_refilled",
    "correction_plus",
    "correction_minus",
    "install",
    "remove",
    "send_to_refill",
    "receive_from_refill",
    "write_off",
    name="cartridgetransactiontype",
    native_enum=False,
    create_constraint=True,
)
cartridge_condition = sa.Enum(
    "new",
    "refilled",
    name="cartridgecondition",
    native_enum=False,
    create_constraint=True,
)
cartridge_color_role = sa.Enum(
    "black",
    "cyan",
    "magenta",
    "yellow",
    "other",
    name="cartridgecolorrole",
    native_enum=False,
    create_constraint=True,
)
installed_cartridge_status = sa.Enum(
    "installed",
    "empty",
    "removed",
    name="installedcartridgestatus",
    native_enum=False,
    create_constraint=True,
)


def upgrade() -> None:
    op.create_table(
        "cartridge_inventory_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cartridge_model_id", sa.Integer(), nullable=False),
        sa.Column("transaction_type", cartridge_transaction_type, nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("item_condition", cartridge_condition, nullable=True),
        sa.Column("printer_id", sa.Integer(), nullable=True),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("slot_name", sa.String(length=100), nullable=True),
        sa.Column("color_role", cartridge_color_role, nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("related_transaction_id", sa.Integer(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_cartridge_transactions_quantity_positive"),
        sa.ForeignKeyConstraint(["cartridge_model_id"], ["cartridge_models.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"]),
        sa.ForeignKeyConstraint(
            ["related_transaction_id"], ["cartridge_inventory_transactions.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_cartridge_inventory_transactions_cartridge_model_id",
        "cartridge_inventory_transactions",
        ["cartridge_model_id"],
    )
    op.create_index(
        "ix_cartridge_inventory_transactions_created_at",
        "cartridge_inventory_transactions",
        ["created_at"],
    )
    op.create_index(
        "ix_cartridge_inventory_transactions_created_by_user_id",
        "cartridge_inventory_transactions",
        ["created_by_user_id"],
    )
    op.create_index(
        "ix_cartridge_inventory_transactions_location_id",
        "cartridge_inventory_transactions",
        ["location_id"],
    )
    op.create_index(
        "ix_cartridge_inventory_transactions_printer_id",
        "cartridge_inventory_transactions",
        ["printer_id"],
    )
    op.create_index(
        "ix_cartridge_inventory_transactions_transaction_type",
        "cartridge_inventory_transactions",
        ["transaction_type"],
    )

    op.create_table(
        "printer_installed_cartridges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_id", sa.Integer(), nullable=False),
        sa.Column("cartridge_model_id", sa.Integer(), nullable=False),
        sa.Column("slot_name", sa.String(length=100), nullable=True),
        sa.Column("color_role", cartridge_color_role, nullable=True),
        sa.Column("item_condition", cartridge_condition, nullable=False),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("installed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("status", installed_cartridge_status, server_default="installed", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["cartridge_model_id"], ["cartridge_models.id"]),
        sa.ForeignKeyConstraint(["installed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_printer_installed_cartridges_cartridge_model_id",
        "printer_installed_cartridges",
        ["cartridge_model_id"],
    )
    op.create_index(
        "ix_printer_installed_cartridges_created_at",
        "printer_installed_cartridges",
        ["created_at"],
    )
    op.create_index(
        "ix_printer_installed_cartridges_installed_by_user_id",
        "printer_installed_cartridges",
        ["installed_by_user_id"],
    )
    op.create_index(
        "ix_printer_installed_cartridges_printer_id",
        "printer_installed_cartridges",
        ["printer_id"],
    )

    op.create_table(
        "printer_cartridge_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_id", sa.Integer(), nullable=False),
        sa.Column("cartridge_model_id", sa.Integer(), nullable=False),
        sa.Column("slot_name", sa.String(length=100), nullable=True),
        sa.Column("color_role", cartridge_color_role, nullable=True),
        sa.Column("item_condition", cartridge_condition, nullable=False),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("installed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("removed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("removal_reason", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["cartridge_model_id"], ["cartridge_models.id"]),
        sa.ForeignKeyConstraint(["installed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"]),
        sa.ForeignKeyConstraint(["removed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_printer_cartridge_history_cartridge_model_id",
        "printer_cartridge_history",
        ["cartridge_model_id"],
    )
    op.create_index(
        "ix_printer_cartridge_history_created_at",
        "printer_cartridge_history",
        ["created_at"],
    )
    op.create_index(
        "ix_printer_cartridge_history_installed_by_user_id",
        "printer_cartridge_history",
        ["installed_by_user_id"],
    )
    op.create_index(
        "ix_printer_cartridge_history_printer_id",
        "printer_cartridge_history",
        ["printer_id"],
    )
    op.create_index(
        "ix_printer_cartridge_history_removed_by_user_id",
        "printer_cartridge_history",
        ["removed_by_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_printer_cartridge_history_removed_by_user_id", table_name="printer_cartridge_history")
    op.drop_index("ix_printer_cartridge_history_printer_id", table_name="printer_cartridge_history")
    op.drop_index("ix_printer_cartridge_history_installed_by_user_id", table_name="printer_cartridge_history")
    op.drop_index("ix_printer_cartridge_history_created_at", table_name="printer_cartridge_history")
    op.drop_index("ix_printer_cartridge_history_cartridge_model_id", table_name="printer_cartridge_history")
    op.drop_table("printer_cartridge_history")

    op.drop_index("ix_printer_installed_cartridges_printer_id", table_name="printer_installed_cartridges")
    op.drop_index("ix_printer_installed_cartridges_installed_by_user_id", table_name="printer_installed_cartridges")
    op.drop_index("ix_printer_installed_cartridges_created_at", table_name="printer_installed_cartridges")
    op.drop_index("ix_printer_installed_cartridges_cartridge_model_id", table_name="printer_installed_cartridges")
    op.drop_table("printer_installed_cartridges")

    op.drop_index("ix_cartridge_inventory_transactions_transaction_type", table_name="cartridge_inventory_transactions")
    op.drop_index("ix_cartridge_inventory_transactions_printer_id", table_name="cartridge_inventory_transactions")
    op.drop_index("ix_cartridge_inventory_transactions_location_id", table_name="cartridge_inventory_transactions")
    op.drop_index("ix_cartridge_inventory_transactions_created_by_user_id", table_name="cartridge_inventory_transactions")
    op.drop_index("ix_cartridge_inventory_transactions_created_at", table_name="cartridge_inventory_transactions")
    op.drop_index("ix_cartridge_inventory_transactions_cartridge_model_id", table_name="cartridge_inventory_transactions")
    op.drop_table("cartridge_inventory_transactions")

