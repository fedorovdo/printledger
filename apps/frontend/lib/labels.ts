import type { Locale } from "@/lib/i18n";
import type { Location, Printer, PrinterModel } from "@/lib/types";

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

export function dash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "\u2014" : String(value);
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
  const locationName = typeof location === "string" ? location : location?.display_name;
  const parts = [
    dash(modelName),
    `Инв. ${dash(printer.inventory_number)}`,
    locationName,
    printer.ip_address ? `IP ${printer.ip_address}` : undefined,
  ];

  return parts.filter((part) => part !== undefined && part !== "").join(" · ");
}

export function removeActionFlags(removalAction: string) {
  return {
    return_to_stock: removalAction === "return_to_stock",
    send_to_refill: removalAction === "send_to_refill",
    write_off: removalAction === "write_off",
  };
}
