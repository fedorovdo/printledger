"""create printer lifecycle tables

Revision ID: 20260504_0003
Revises: 20260504_0002
Create Date: 2026-05-04 22:00:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260504_0003"
down_revision: str | None = "20260504_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


printer_repair_status = sa.Enum(
    "sent",
    "in_progress",
    "returned",
    "cancelled",
    name="printerrepairstatus",
    native_enum=False,
    create_constraint=True,
)
printer_archive_reason = sa.Enum(
    "archived",
    "written_off",
    "lost",
    "duplicate",
    "error",
    name="printerarchivereason",
    native_enum=False,
    create_constraint=True,
)


def upgrade() -> None:
    op.create_table(
        "printer_location_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_id", sa.Integer(), nullable=False),
        sa.Column("from_location_id", sa.Integer(), nullable=True),
        sa.Column("to_location_id", sa.Integer(), nullable=True),
        sa.Column("moved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["from_location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"]),
        sa.ForeignKeyConstraint(["to_location_id"], ["locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_printer_location_history_created_by_user_id",
        "printer_location_history",
        ["created_by_user_id"],
    )
    op.create_index(
        "ix_printer_location_history_moved_at",
        "printer_location_history",
        ["moved_at"],
    )
    op.create_index(
        "ix_printer_location_history_printer_id",
        "printer_location_history",
        ["printer_id"],
    )

    op.create_table(
        "printer_repairs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_id", sa.Integer(), nullable=False),
        sa.Column("repair_status", printer_repair_status, nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("service_company", sa.String(length=255), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_printer_repairs_created_by_user_id", "printer_repairs", ["created_by_user_id"])
    op.create_index("ix_printer_repairs_printer_id", "printer_repairs", ["printer_id"])
    op.create_index("ix_printer_repairs_returned_at", "printer_repairs", ["returned_at"])
    op.create_index("ix_printer_repairs_sent_at", "printer_repairs", ["sent_at"])

    op.create_table(
        "printer_archive_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_id", sa.Integer(), nullable=False),
        sa.Column("archive_reason", printer_archive_reason, nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_printer_archive_history_archived_at",
        "printer_archive_history",
        ["archived_at"],
    )
    op.create_index(
        "ix_printer_archive_history_created_by_user_id",
        "printer_archive_history",
        ["created_by_user_id"],
    )
    op.create_index(
        "ix_printer_archive_history_printer_id",
        "printer_archive_history",
        ["printer_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_printer_archive_history_printer_id", table_name="printer_archive_history")
    op.drop_index("ix_printer_archive_history_created_by_user_id", table_name="printer_archive_history")
    op.drop_index("ix_printer_archive_history_archived_at", table_name="printer_archive_history")
    op.drop_table("printer_archive_history")

    op.drop_index("ix_printer_repairs_sent_at", table_name="printer_repairs")
    op.drop_index("ix_printer_repairs_returned_at", table_name="printer_repairs")
    op.drop_index("ix_printer_repairs_printer_id", table_name="printer_repairs")
    op.drop_index("ix_printer_repairs_created_by_user_id", table_name="printer_repairs")
    op.drop_table("printer_repairs")

    op.drop_index("ix_printer_location_history_printer_id", table_name="printer_location_history")
    op.drop_index("ix_printer_location_history_moved_at", table_name="printer_location_history")
    op.drop_index("ix_printer_location_history_created_by_user_id", table_name="printer_location_history")
    op.drop_table("printer_location_history")

