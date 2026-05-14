"""Add user role to users.

Revision ID: 20260514_0005
Revises: 20260504_0004
Create Date: 2026-05-14
"""

from alembic import op


revision = "20260514_0005"
down_revision = "20260504_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("userrole", "users", type_="check")
    op.create_check_constraint(
        "userrole",
        "users",
        "role IN ('admin', 'user', 'operator', 'viewer')",
    )


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'viewer' WHERE role = 'user'")
    op.drop_constraint("userrole", "users", type_="check")
    op.create_check_constraint(
        "userrole",
        "users",
        "role IN ('admin', 'operator', 'viewer')",
    )
