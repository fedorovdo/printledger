import type { Locale } from "@/lib/i18n";
import type { Branch, Location, Organization, Printer, PrinterModel } from "@/lib/types";

const operationLabels = {
  ru: {
    stock_in_new: "Приход нового",
    stock_in_refilled: "Приход заправленного",
    correction_plus: "Корректировка +",
    correction_minus: "Корректировка -",
    install: "Установка",
    remove: "Снятие",
    return_to_stock: "Возврат на склад",
    send_to_refill: "На заправку",
    receive_from_refill: "Возврат из заправки",
    write_off: "Списание",
  },
  en: {
    stock_in_new: "Stock-in new",
    stock_in_refilled: "Stock-in refilled",
    correction_plus: "Correction +",
    correction_minus: "Correction -",
    install: "Install",
    remove: "Remove",
    return_to_stock: "Return to stock",
    send_to_refill: "Send to refill",
    receive_from_refill: "Return from refill",
    write_off: "Write off",
  },
};

export function labelTransaction(type: string, locale: Locale) {
  return operationLabels[locale][type as keyof typeof operationLabels.ru] ?? type;
}

function formatEnum(
  value: string | null | undefined,
  locale: Locale,
  labels: Record<Locale, Record<string, string>>,
) {
  if (!value) {
    return dash(value);
  }
  return labels[locale][value] ?? value;
}

export function formatCartridgeCondition(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      new: "Новый",
      refilled: "Заправленный",
    },
    en: {
      new: "New",
      refilled: "Refilled",
    },
  });
}

export function formatCorrectionDirection(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      plus: "Плюс",
      minus: "Минус",
    },
    en: {
      plus: "Add",
      minus: "Subtract",
    },
  });
}

export function formatColorRole(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      black: "Черный",
      cyan: "Голубой",
      magenta: "Пурпурный",
      yellow: "Желтый",
      other: "Другое",
    },
    en: {
      black: "Black",
      cyan: "Cyan",
      magenta: "Magenta",
      yellow: "Yellow",
      other: "Other",
    },
  });
}

export function formatCartridgeType(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      toner: "Тонер",
      ink: "Чернила",
      other: "Другое",
    },
    en: {
      toner: "Toner",
      ink: "Ink",
      other: "Other",
    },
  });
}

export function formatPrintTechnology(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      laser: "Лазерный",
      inkjet: "Струйный",
      other: "Другое",
    },
    en: {
      laser: "Laser",
      inkjet: "Inkjet",
      other: "Other",
    },
  });
}

export function formatColorMode(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      mono: "Монохромный",
      color: "Цветной",
    },
    en: {
      mono: "Mono",
      color: "Color",
    },
  });
}

export function formatInstalledCartridgeStatus(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      installed: "Установлен",
      empty: "Пустой",
      removed: "Снят",
    },
    en: {
      installed: "Installed",
      empty: "Empty",
      removed: "Removed",
    },
  });
}

export function formatRemoveAction(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      return_to_stock: "Вернуть на склад",
      send_to_refill: "Отправить на заправку",
      write_off: "Списать",
      remove_only: "Просто снять",
    },
    en: {
      return_to_stock: "Return to stock",
      send_to_refill: "Send to refill",
      write_off: "Write off",
      remove_only: "Remove only",
    },
  });
}

export function formatRepairStatus(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      sent: "Отправлен",
      in_progress: "В работе",
      returned: "Возвращен",
      cancelled: "Отменен",
    },
    en: {
      sent: "Sent",
      in_progress: "In progress",
      returned: "Returned",
      cancelled: "Cancelled",
    },
  });
}

export function formatArchiveReason(value: string | null | undefined, locale: Locale) {
  return formatEnum(value, locale, {
    ru: {
      archived: "Архив",
      written_off: "Списан",
      lost: "Утерян",
      duplicate: "Дубликат",
      error: "Ошибка",
    },
    en: {
      archived: "Archived",
      written_off: "Written off",
      lost: "Lost",
      duplicate: "Duplicate",
      error: "Error",
    },
  });
}

export function dash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "\u2014" : String(value);
}

function locationRoomLabel(room: string | null | undefined, locale: Locale) {
  if (!room) {
    return null;
  }
  return `${locale === "ru" ? "каб." : "room"} ${room}`;
}

export function formatLocationRoom(location: Location | null | undefined, locale: Locale) {
  void locale;
  return dash(location?.room);
}

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isAutoLocationDisplayName(location: Location | null | undefined) {
  if (!location?.display_name || !location.room) {
    return false;
  }

  const displayName = normalizeLabel(location.display_name);
  const autoRoomOnly = normalizeLabel(`каб. ${location.room}`);
  const autoWithDepartment = normalizeLabel(
    location.department ? `${location.department}, каб. ${location.room}` : "",
  );

  return displayName === autoRoomOnly || (autoWithDepartment !== "" && displayName === autoWithDepartment);
}

export function formatLocationDescription(location: Location | null | undefined) {
  if (!location?.display_name || isAutoLocationDisplayName(location)) {
    return dash(null);
  }
  return location.display_name;
}

export function formatLocationPlaceLabel(
  location: Location | null | undefined,
  organizationMap: ReadonlyMap<number, Organization | string>,
  branchMap: ReadonlyMap<number, Branch | string>,
) {
  if (!location) {
    return dash(null);
  }

  const organization = organizationMap.get(location.organization_id);
  const organizationName = typeof organization === "string" ? organization : organization?.name;
  const branch = location.branch_id ? branchMap.get(location.branch_id) : undefined;
  const branchName = typeof branch === "string" ? branch : branch?.name;
  const leading = branchName || organizationName;
  const parts = [leading, location.department];

  return parts.filter((part) => part !== undefined && part !== null && part !== "").join(", ") || dash(null);
}

export function formatLocationLabel(
  location: Location | null | undefined,
  organizationMap: ReadonlyMap<number, Organization | string>,
  branchMap: ReadonlyMap<number, Branch | string>,
  locale: Locale,
  variant: "full" | "short" = "full",
) {
  if (!location) {
    return dash(null);
  }

  const organization = organizationMap.get(location.organization_id);
  const organizationName = typeof organization === "string" ? organization : organization?.name;
  const branch = location.branch_id ? branchMap.get(location.branch_id) : undefined;
  const branchName = typeof branch === "string" ? branch : branch?.name;
  const room = locationRoomLabel(location.room, locale);
  const tail = room ?? location.display_name;
  const shortLeading = branchName || organizationName;
  const parts = variant === "full"
    ? [organizationName, branchName, location.department, tail]
    : [shortLeading, location.department, tail];

  return parts
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(variant === "full" ? " / " : ", ");
}

export function formatPrinterLabel(
  printer: Printer,
  printerModelMap: ReadonlyMap<number, PrinterModel | string>,
  locationMap: ReadonlyMap<number, Location | string>,
) {
  const printerModel = printerModelMap.get(printer.printer_model_id);
  const modelName = typeof printerModel === "string" ? printerModel : printerModel?.name;
  const location = printer.current_location_id
    ? locationMap.get(printer.current_location_id)
    : undefined;
  const locationName = typeof location === "string"
    ? location
    : location?.room
      ? `${location.department ? `${location.department}, ` : ""}каб. ${location.room}`
      : location?.display_name;
  const parts = [
    dash(modelName),
    `Инв. ${dash(printer.inventory_number)}`,
    locationName,
    printer.ip_address ? `IP ${printer.ip_address}` : undefined,
  ];

  return parts.filter((part) => part !== undefined && part !== "").join(" · ");
}

export function isArchivedPrinter(printer: Printer) {
  return printer.is_archived || printer.status === "archived" || printer.status === "written_off";
}

export function isActivePrinter(printer: Printer) {
  return !isArchivedPrinter(printer) && printer.status === "in_work";
}

export function isRepairPrinter(printer: Printer) {
  return !isArchivedPrinter(printer) && printer.status === "in_repair";
}

export function labelPrinterStatus(type: string, locale: Locale) {
  const labels = {
    ru: {
      in_work: "В работе",
      in_repair: "В ремонте",
      archived: "Архив",
      written_off: "Списан",
    },
    en: {
      in_work: "In work",
      in_repair: "In repair",
      archived: "Archived",
      written_off: "Written off",
    },
  };

  return labels[locale][type as keyof typeof labels.ru] ?? type;
}

export function removeActionFlags(removalAction: string) {
  return {
    return_to_stock: removalAction === "return_to_stock",
    send_to_refill: removalAction === "send_to_refill",
    write_off: removalAction === "write_off",
  };
}
