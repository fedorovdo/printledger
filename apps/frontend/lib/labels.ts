import type { Locale } from "@/lib/i18n";

const operationLabels = {
  ru: {
    stock_in_new: "Приход нового",
    stock_in_refilled: "Приход заправленного",
    correction_plus: "Корректировка +",
    correction_minus: "Корректировка -",
    install: "Установка",
    remove: "Снятие",
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
