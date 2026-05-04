from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import (
    CartridgeColorRole,
    CartridgeCondition,
    CartridgeTransactionType,
    CartridgeType,
    ColorMode,
    ColorRole,
    InstalledCartridgeStatus,
    PrinterArchiveReason,
    PrinterRepairStatus,
    PrinterStatus,
    PrintTechnology,
    UserRole,
)


def enum_column(enum_class: type) -> SAEnum:
    return SAEnum(
        enum_class,
        name=enum_class.__name__.lower(),
        values_callable=lambda enum_type: [member.value for member in enum_type],
        native_enum=False,
        create_constraint=True,
        validate_strings=True,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        enum_column(UserRole), default=UserRole.viewer, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    audit_events: Mapped[list["AuditLog"]] = relationship(back_populates="user")


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    short_name: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    branches: Mapped[list["Branch"]] = relationship(back_populates="organization")
    locations: Mapped[list["Location"]] = relationship(back_populates="organization")


class Branch(Base, TimestampMixin):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    organization: Mapped["Organization"] = relationship(back_populates="branches")
    locations: Mapped[list["Location"]] = relationship(back_populates="branch")


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id"), index=True)
    department: Mapped[str | None] = mapped_column(String(255))
    room: Mapped[str | None] = mapped_column(String(100))
    display_name: Mapped[str] = mapped_column(String(255), index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    organization: Mapped["Organization"] = relationship(back_populates="locations")
    branch: Mapped["Branch | None"] = relationship(back_populates="locations")
    printers: Mapped[list["Printer"]] = relationship(back_populates="current_location")


class PrinterModel(Base, TimestampMixin):
    __tablename__ = "printer_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor: Mapped[str | None] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(255), index=True)
    print_technology: Mapped[PrintTechnology] = mapped_column(
        enum_column(PrintTechnology), nullable=False
    )
    color_mode: Mapped[ColorMode] = mapped_column(enum_column(ColorMode), nullable=False)
    cartridge_slots_count: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    compatible_cartridges: Mapped[list["PrinterModelCompatibleCartridge"]] = relationship(
        back_populates="printer_model"
    )
    printers: Mapped[list["Printer"]] = relationship(back_populates="printer_model")


class CartridgeModel(Base, TimestampMixin):
    __tablename__ = "cartridge_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor: Mapped[str | None] = mapped_column(String(100))
    model_name: Mapped[str] = mapped_column(String(255), index=True)
    purchase_sku: Mapped[str | None] = mapped_column(String(100), index=True)
    cartridge_type: Mapped[CartridgeType] = mapped_column(
        enum_column(CartridgeType), nullable=False
    )
    min_stock_level: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    compatible_printer_models: Mapped[list["PrinterModelCompatibleCartridge"]] = relationship(
        back_populates="cartridge_model"
    )


class PrinterModelCompatibleCartridge(Base):
    __tablename__ = "printer_model_compatible_cartridges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_model_id: Mapped[int] = mapped_column(ForeignKey("printer_models.id"), index=True)
    cartridge_model_id: Mapped[int] = mapped_column(ForeignKey("cartridge_models.id"), index=True)
    slot_name: Mapped[str | None] = mapped_column(String(100))
    color_role: Mapped[ColorRole | None] = mapped_column(enum_column(ColorRole))
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    printer_model: Mapped["PrinterModel"] = relationship(back_populates="compatible_cartridges")
    cartridge_model: Mapped["CartridgeModel"] = relationship(
        back_populates="compatible_printer_models"
    )


class Printer(Base, TimestampMixin):
    __tablename__ = "printers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_model_id: Mapped[int] = mapped_column(ForeignKey("printer_models.id"), index=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    inventory_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    ip_address: Mapped[str | None] = mapped_column(INET)
    mac_address: Mapped[str | None] = mapped_column(String(17))
    web_login: Mapped[str | None] = mapped_column(String(100))
    web_password: Mapped[str | None] = mapped_column(String(255))
    current_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), index=True)
    status: Mapped[PrinterStatus] = mapped_column(
        enum_column(PrinterStatus), default=PrinterStatus.in_work, server_default="in_work"
    )
    notes: Mapped[str | None] = mapped_column(Text)
    commissioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decommissioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    printer_model: Mapped["PrinterModel"] = relationship(back_populates="printers")
    current_location: Mapped["Location | None"] = relationship(back_populates="printers")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(100), index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, index=True)
    action_type: Mapped[str] = mapped_column(String(100), index=True)
    old_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    new_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User | None"] = relationship(back_populates="audit_events")


class CartridgeInventoryTransaction(Base):
    __tablename__ = "cartridge_inventory_transactions"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_cartridge_transactions_quantity_positive"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cartridge_model_id: Mapped[int] = mapped_column(ForeignKey("cartridge_models.id"), index=True)
    transaction_type: Mapped[CartridgeTransactionType] = mapped_column(
        enum_column(CartridgeTransactionType), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    item_condition: Mapped[CartridgeCondition | None] = mapped_column(
        enum_column(CartridgeCondition)
    )
    printer_id: Mapped[int | None] = mapped_column(ForeignKey("printers.id"), index=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), index=True)
    slot_name: Mapped[str | None] = mapped_column(String(100))
    color_role: Mapped[CartridgeColorRole | None] = mapped_column(enum_column(CartridgeColorRole))
    reason: Mapped[str | None] = mapped_column(String(255))
    comment: Mapped[str | None] = mapped_column(Text)
    related_transaction_id: Mapped[int | None] = mapped_column(
        ForeignKey("cartridge_inventory_transactions.id")
    )
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    cartridge_model: Mapped["CartridgeModel"] = relationship()
    printer: Mapped["Printer | None"] = relationship()
    location: Mapped["Location | None"] = relationship()
    related_transaction: Mapped["CartridgeInventoryTransaction | None"] = relationship(
        remote_side=[id]
    )
    created_by_user: Mapped["User | None"] = relationship()


class PrinterInstalledCartridge(Base, TimestampMixin):
    __tablename__ = "printer_installed_cartridges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id"), index=True)
    cartridge_model_id: Mapped[int] = mapped_column(ForeignKey("cartridge_models.id"), index=True)
    slot_name: Mapped[str | None] = mapped_column(String(100))
    color_role: Mapped[CartridgeColorRole | None] = mapped_column(enum_column(CartridgeColorRole))
    item_condition: Mapped[CartridgeCondition] = mapped_column(
        enum_column(CartridgeCondition), nullable=False
    )
    installed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    installed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[InstalledCartridgeStatus] = mapped_column(
        enum_column(InstalledCartridgeStatus),
        default=InstalledCartridgeStatus.installed,
        server_default="installed",
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)

    printer: Mapped["Printer"] = relationship()
    cartridge_model: Mapped["CartridgeModel"] = relationship()
    installed_by_user: Mapped["User | None"] = relationship()


class PrinterCartridgeHistory(Base, TimestampMixin):
    __tablename__ = "printer_cartridge_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id"), index=True)
    cartridge_model_id: Mapped[int] = mapped_column(ForeignKey("cartridge_models.id"), index=True)
    slot_name: Mapped[str | None] = mapped_column(String(100))
    color_role: Mapped[CartridgeColorRole | None] = mapped_column(enum_column(CartridgeColorRole))
    item_condition: Mapped[CartridgeCondition] = mapped_column(
        enum_column(CartridgeCondition), nullable=False
    )
    installed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    installed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    removed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    removal_reason: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)

    printer: Mapped["Printer"] = relationship()
    cartridge_model: Mapped["CartridgeModel"] = relationship()
    installed_by_user: Mapped["User | None"] = relationship(foreign_keys=[installed_by_user_id])
    removed_by_user: Mapped["User | None"] = relationship(foreign_keys=[removed_by_user_id])


class PrinterLocationHistory(Base):
    __tablename__ = "printer_location_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id"), index=True)
    from_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"))
    to_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"))
    moved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    printer: Mapped["Printer"] = relationship()
    from_location: Mapped["Location | None"] = relationship(foreign_keys=[from_location_id])
    to_location: Mapped["Location | None"] = relationship(foreign_keys=[to_location_id])
    created_by_user: Mapped["User | None"] = relationship()


class PrinterRepair(Base, TimestampMixin):
    __tablename__ = "printer_repairs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id"), index=True)
    repair_status: Mapped[PrinterRepairStatus] = mapped_column(
        enum_column(PrinterRepairStatus), nullable=False
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    service_company: Mapped[str | None] = mapped_column(String(255))
    reason: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)

    printer: Mapped["Printer"] = relationship()
    created_by_user: Mapped["User | None"] = relationship()


class PrinterArchiveHistory(Base):
    __tablename__ = "printer_archive_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    printer_id: Mapped[int] = mapped_column(ForeignKey("printers.id"), index=True)
    archive_reason: Mapped[PrinterArchiveReason] = mapped_column(
        enum_column(PrinterArchiveReason), nullable=False
    )
    archived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    printer: Mapped["Printer"] = relationship()
    created_by_user: Mapped["User | None"] = relationship()
