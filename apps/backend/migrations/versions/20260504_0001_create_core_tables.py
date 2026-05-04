"""create core tables

Revision ID: 20260504_0001
Revises:
Create Date: 2026-05-04 20:10:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260504_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


user_role = sa.Enum(
    "admin",
    "operator",
    "viewer",
    name="userrole",
    native_enum=False,
    create_constraint=True,
)
print_technology = sa.Enum(
    "laser",
    "inkjet",
    "other",
    name="printtechnology",
    native_enum=False,
    create_constraint=True,
)
color_mode = sa.Enum(
    "mono",
    "color",
    name="colormode",
    native_enum=False,
    create_constraint=True,
)
cartridge_type = sa.Enum(
    "toner",
    "ink",
    "other",
    name="cartridgetype",
    native_enum=False,
    create_constraint=True,
)
color_role = sa.Enum(
    "black",
    "cyan",
    "magenta",
    "yellow",
    "other",
    name="colorrole",
    native_enum=False,
    create_constraint=True,
)
printer_status = sa.Enum(
    "in_work",
    "in_repair",
    "archived",
    "written_off",
    name="printerstatus",
    native_enum=False,
    create_constraint=True,
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("short_name", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organizations_name", "organizations", ["name"], unique=True)

    op.create_table(
        "branches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_branches_name", "branches", ["name"])
    op.create_index("ix_branches_organization_id", "branches", ["organization_id"])

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("branch_id", sa.Integer(), nullable=True),
        sa.Column("department", sa.String(length=255), nullable=True),
        sa.Column("room", sa.String(length=100), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_locations_branch_id", "locations", ["branch_id"])
    op.create_index("ix_locations_display_name", "locations", ["display_name"])
    op.create_index("ix_locations_organization_id", "locations", ["organization_id"])

    op.create_table(
        "printer_models",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vendor", sa.String(length=100), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("print_technology", print_technology, nullable=False),
        sa.Column("color_mode", color_mode, nullable=False),
        sa.Column("cartridge_slots_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_printer_models_name", "printer_models", ["name"])

    op.create_table(
        "cartridge_models",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vendor", sa.String(length=100), nullable=True),
        sa.Column("model_name", sa.String(length=255), nullable=False),
        sa.Column("purchase_sku", sa.String(length=100), nullable=True),
        sa.Column("cartridge_type", cartridge_type, nullable=False),
        sa.Column("min_stock_level", sa.Integer(), server_default="0", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cartridge_models_model_name", "cartridge_models", ["model_name"])
    op.create_index("ix_cartridge_models_purchase_sku", "cartridge_models", ["purchase_sku"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action_type", sa.String(length=100), nullable=False),
        sa.Column("old_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("new_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_action_type", "audit_log", ["action_type"])
    op.create_index("ix_audit_log_entity_id", "audit_log", ["entity_id"])
    op.create_index("ix_audit_log_entity_type", "audit_log", ["entity_type"])
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])

    op.create_table(
        "printer_model_compatible_cartridges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_model_id", sa.Integer(), nullable=False),
        sa.Column("cartridge_model_id", sa.Integer(), nullable=False),
        sa.Column("slot_name", sa.String(length=100), nullable=True),
        sa.Column("color_role", color_role, nullable=True),
        sa.Column("is_required", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["cartridge_model_id"], ["cartridge_models.id"]),
        sa.ForeignKeyConstraint(["printer_model_id"], ["printer_models.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pmcc_cartridge_model_id",
        "printer_model_compatible_cartridges",
        ["cartridge_model_id"],
    )
    op.create_index(
        "ix_pmcc_printer_model_id",
        "printer_model_compatible_cartridges",
        ["printer_model_id"],
    )

    op.create_table(
        "printers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("printer_model_id", sa.Integer(), nullable=False),
        sa.Column("serial_number", sa.String(length=100), nullable=True),
        sa.Column("inventory_number", sa.String(length=100), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("mac_address", sa.String(length=17), nullable=True),
        sa.Column("web_login", sa.String(length=100), nullable=True),
        sa.Column("web_password", sa.String(length=255), nullable=True),
        sa.Column("current_location_id", sa.Integer(), nullable=True),
        sa.Column("status", printer_status, server_default="in_work", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("commissioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decommissioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_archived", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["current_location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["printer_model_id"], ["printer_models.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("inventory_number"),
        sa.UniqueConstraint("serial_number"),
    )
    op.create_index("ix_printers_current_location_id", "printers", ["current_location_id"])
    op.create_index("ix_printers_printer_model_id", "printers", ["printer_model_id"])


def downgrade() -> None:
    op.drop_index("ix_printers_printer_model_id", table_name="printers")
    op.drop_index("ix_printers_current_location_id", table_name="printers")
    op.drop_table("printers")

    op.drop_index("ix_pmcc_printer_model_id", table_name="printer_model_compatible_cartridges")
    op.drop_index("ix_pmcc_cartridge_model_id", table_name="printer_model_compatible_cartridges")
    op.drop_table("printer_model_compatible_cartridges")

    op.drop_index("ix_audit_log_user_id", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_type", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_id", table_name="audit_log")
    op.drop_index("ix_audit_log_action_type", table_name="audit_log")
    op.drop_table("audit_log")

    op.drop_index("ix_cartridge_models_purchase_sku", table_name="cartridge_models")
    op.drop_index("ix_cartridge_models_model_name", table_name="cartridge_models")
    op.drop_table("cartridge_models")

    op.drop_index("ix_printer_models_name", table_name="printer_models")
    op.drop_table("printer_models")

    op.drop_index("ix_locations_organization_id", table_name="locations")
    op.drop_index("ix_locations_display_name", table_name="locations")
    op.drop_index("ix_locations_branch_id", table_name="locations")
    op.drop_table("locations")

    op.drop_index("ix_branches_organization_id", table_name="branches")
    op.drop_index("ix_branches_name", table_name="branches")
    op.drop_table("branches")

    op.drop_index("ix_organizations_name", table_name="organizations")
    op.drop_table("organizations")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

