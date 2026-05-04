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

