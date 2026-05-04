from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    operator = "operator"
    viewer = "viewer"


class PrintTechnology(str, Enum):
    laser = "laser"
    inkjet = "inkjet"
    other = "other"


class ColorMode(str, Enum):
    mono = "mono"
    color = "color"


class CartridgeType(str, Enum):
    toner = "toner"
    ink = "ink"
    other = "other"


class ColorRole(str, Enum):
    black = "black"
    cyan = "cyan"
    magenta = "magenta"
    yellow = "yellow"
    other = "other"


class PrinterStatus(str, Enum):
    in_work = "in_work"
    in_repair = "in_repair"
    archived = "archived"
    written_off = "written_off"


class CartridgeTransactionType(str, Enum):
    stock_in_new = "stock_in_new"
    stock_in_refilled = "stock_in_refilled"
    correction_plus = "correction_plus"
    correction_minus = "correction_minus"
    install = "install"
    remove = "remove"
    return_to_stock = "return_to_stock"
    send_to_refill = "send_to_refill"
    receive_from_refill = "receive_from_refill"
    write_off = "write_off"


class CartridgeCondition(str, Enum):
    new = "new"
    refilled = "refilled"


class CartridgeColorRole(str, Enum):
    black = "black"
    cyan = "cyan"
    magenta = "magenta"
    yellow = "yellow"
    other = "other"


class InstalledCartridgeStatus(str, Enum):
    installed = "installed"
    empty = "empty"
    removed = "removed"


class PrinterRepairStatus(str, Enum):
    sent = "sent"
    in_progress = "in_progress"
    returned = "returned"
    cancelled = "cancelled"


class PrinterArchiveReason(str, Enum):
    archived = "archived"
    written_off = "written_off"
    lost = "lost"
    duplicate = "duplicate"
    error = "error"
