"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "ru" | "en";

export const translations = {
  ru: {
    dashboard: "Dashboard",
    cartridges: "Картриджи",
    printers: "Принтеры",
    locations: "Локации",
    operations: "Операции",
    backendStatus: "Статус backend",
    databaseStatus: "Статус базы данных",
    cartridgeModels: "Модели картриджей",
    printerCount: "Принтеры",
    archivedPrinters: "Архивные принтеры",
    ok: "OK",
    loading: "Загрузка...",
    error: "Ошибка",
    refresh: "Обновить",
    addCartridgeModel: "Добавить модель картриджа",
    stockIn: "Приход",
    model: "Модель",
    sku: "Артикул",
    stockNew: "Новые на складе",
    stockRefilled: "Заправленные",
    installed: "Установлено",
    total: "Всего",
    minStock: "Мин. остаток",
    vendor: "Производитель",
    modelName: "Модель",
    cartridgeType: "Тип картриджа",
    minStockLevel: "Мин. остаток",
    notes: "Заметки",
    save: "Сохранить",
    cartridgeModel: "Модель картриджа",
    quantity: "Количество",
    condition: "Состояние",
    reason: "Причина",
    comment: "Комментарий",
    addPrinterModel: "Добавить модель принтера",
    addPrinter: "Добавить принтер",
    printerModel: "Модель принтера",
    inventoryNumber: "Инв. номер",
    serialNumber: "Серийный номер",
    ipAddress: "IP",
    location: "Место",
    status: "Статус",
    archived: "Архив",
    printTechnology: "Технология",
    colorMode: "Цветность",
    slots: "Слоты",
    macAddress: "MAC",
    organizations: "Организации",
    branches: "Филиалы",
    branch: "Филиал",
    displayName: "Название",
    shortName: "Короткое имя",
    address: "Адрес",
    department: "Отдел",
    room: "Кабинет",
    date: "Дата",
    transactionType: "Тип операции",
    printerId: "Printer ID",
    noData: "Нет данных",
    created: "Создано",
  },
  en: {
    dashboard: "Dashboard",
    cartridges: "Cartridges",
    printers: "Printers",
    locations: "Locations",
    operations: "Operations",
    backendStatus: "Backend status",
    databaseStatus: "Database status",
    cartridgeModels: "Cartridge models",
    printerCount: "Printers",
    archivedPrinters: "Archived printers",
    ok: "OK",
    loading: "Loading...",
    error: "Error",
    refresh: "Refresh",
    addCartridgeModel: "Add cartridge model",
    stockIn: "Stock-in",
    model: "Model",
    sku: "SKU",
    stockNew: "New in stock",
    stockRefilled: "Refilled in stock",
    installed: "Installed",
    total: "Total",
    minStock: "Min stock",
    vendor: "Vendor",
    modelName: "Model",
    cartridgeType: "Cartridge type",
    minStockLevel: "Min stock",
    notes: "Notes",
    save: "Save",
    cartridgeModel: "Cartridge model",
    quantity: "Quantity",
    condition: "Condition",
    reason: "Reason",
    comment: "Comment",
    addPrinterModel: "Add printer model",
    addPrinter: "Add printer",
    printerModel: "Printer model",
    inventoryNumber: "Inventory no.",
    serialNumber: "Serial no.",
    ipAddress: "IP",
    location: "Location",
    status: "Status",
    archived: "Archived",
    printTechnology: "Technology",
    colorMode: "Color mode",
    slots: "Slots",
    macAddress: "MAC",
    organizations: "Organizations",
    branches: "Branches",
    branch: "Branch",
    displayName: "Display name",
    shortName: "Short name",
    address: "Address",
    department: "Department",
    room: "Room",
    date: "Date",
    transactionType: "Transaction type",
    printerId: "Printer ID",
    noData: "No data",
    created: "Created",
  },
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (typeof translations)["ru"];
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const stored = window.localStorage.getItem("printledger-locale");
    if (stored === "ru" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const setLocale = (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      window.localStorage.setItem("printledger-locale", nextLocale);
    };
    return { locale, setLocale, t: translations[locale] };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}

