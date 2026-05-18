import type {
  AppUser,
  BackupFile,
  Branch,
  CartridgeModel,
  CartridgeStock,
  CartridgeTransaction,
  CartridgeUsageAnalytics,
  InstalledCartridge,
  Location,
  Organization,
  Printer,
  PrinterArchiveHistory,
  PrinterCartridgeHistory,
  PrinterLocationHistory,
  PrinterModel,
  PrinterRepair,
} from "@/lib/types";

const now = "2026-05-18T10:00:00Z";

export const demoOrganizations: Organization[] = [
  { id: 1, name: "Starlink Demo Office", short_name: "Starlink Demo", notes: "Demo organization", is_active: true },
];

export const demoBranches: Branch[] = [
  { id: 1, organization_id: 1, name: "Head Office", address: "10 Orbit Street", notes: null, is_active: true },
  { id: 2, organization_id: 1, name: "Warehouse", address: "4 Depot Avenue", notes: null, is_active: true },
];

export const demoLocations: Location[] = [
  { id: 1, organization_id: 1, branch_id: 1, department: "IT", room: "101", display_name: "IT, каб. 101", notes: null, is_active: true },
  { id: 2, organization_id: 1, branch_id: 1, department: "Finance", room: "214", display_name: "Finance, каб. 214", notes: null, is_active: true },
  { id: 3, organization_id: 1, branch_id: 1, department: "HR", room: "118", display_name: "HR, каб. 118", notes: null, is_active: true },
  { id: 4, organization_id: 1, branch_id: 1, department: "Legal", room: "221", display_name: "Legal, каб. 221", notes: null, is_active: true },
  { id: 5, organization_id: 1, branch_id: 1, department: null, room: "316", display_name: "Server room", notes: "Restricted access", is_active: true },
  { id: 6, organization_id: 1, branch_id: 2, department: "Storage", room: "W-1", display_name: "Storage, каб. W-1", notes: null, is_active: true },
  { id: 7, organization_id: 1, branch_id: 2, department: "Dispatch", room: "W-2", display_name: "Dispatch, каб. W-2", notes: null, is_active: true },
  { id: 8, organization_id: 1, branch_id: null, department: "Reception", room: "109", display_name: "Reception, каб. 109", notes: null, is_active: true },
];

export const demoPrinterModels: PrinterModel[] = [
  { id: 1, vendor: "HP", name: "LaserJet Pro M404dn", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 2, vendor: "Brother", name: "HL-L2350DW", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 3, vendor: "Canon", name: "i-SENSYS LBP223dw", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 4, vendor: "Xerox", name: "Phaser 3020", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 5, vendor: "HP", name: "LaserJet P2035", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 6, vendor: "Brother", name: "DCP-L2550DN", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 7, vendor: "Canon", name: "MF3010", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 8, vendor: "Kyocera", name: "ECOSYS P2040dn", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 9, vendor: "HP", name: "LaserJet Pro M428fdw", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
  { id: 10, vendor: "Samsung", name: "Xpress M2020W", print_technology: "laser", color_mode: "mono", cartridge_slots_count: 1, notes: null, is_active: true },
];

export const demoCartridgeModels: CartridgeModel[] = [
  { id: 1, vendor: "HP", model_name: "HP CF259A", purchase_sku: "CF259A", cartridge_type: "toner", min_stock_level: 4, notes: null, is_active: true },
  { id: 2, vendor: "HP", model_name: "HP CF283A", purchase_sku: "CF283A", cartridge_type: "toner", min_stock_level: 3, notes: null, is_active: true },
  { id: 3, vendor: "Brother", model_name: "Brother TN-2375", purchase_sku: "TN-2375", cartridge_type: "toner", min_stock_level: 3, notes: null, is_active: true },
  { id: 4, vendor: "HP", model_name: "HP CE285A", purchase_sku: "CE285A", cartridge_type: "toner", min_stock_level: 2, notes: null, is_active: true },
  { id: 5, vendor: "Canon", model_name: "Canon 725", purchase_sku: "725", cartridge_type: "toner", min_stock_level: 2, notes: null, is_active: true },
  { id: 6, vendor: "Kyocera", model_name: "Kyocera TK-1160", purchase_sku: "TK-1160", cartridge_type: "toner", min_stock_level: 2, notes: null, is_active: true },
  { id: 7, vendor: "Samsung", model_name: "Samsung MLT-D111S", purchase_sku: "MLT-D111S", cartridge_type: "toner", min_stock_level: 2, notes: "Demo inactive model", is_active: false },
];

export const demoPrinters: Printer[] = [
  { id: 1, printer_model_id: 1, serial_number: "HP404-1001", inventory_number: "INV-1001", ip_address: "192.168.10.21", mac_address: "00:11:22:33:44:01", current_location_id: 1, status: "in_work", notes: "Main IT printer", is_archived: false },
  { id: 2, printer_model_id: 2, serial_number: "BR2350-1002", inventory_number: "INV-1002", ip_address: "192.168.10.22", mac_address: "00:11:22:33:44:02", current_location_id: 2, status: "in_work", notes: null, is_archived: false },
  { id: 3, printer_model_id: 3, serial_number: "CN223-1003", inventory_number: "INV-1003", ip_address: "192.168.10.23", mac_address: "00:11:22:33:44:03", current_location_id: 3, status: "in_work", notes: null, is_archived: false },
  { id: 4, printer_model_id: 4, serial_number: "XR3020-1004", inventory_number: "INV-1004", ip_address: "192.168.10.24", mac_address: "00:11:22:33:44:04", current_location_id: 4, status: "in_repair", notes: "Paper feed issue", is_archived: false },
  { id: 5, printer_model_id: 5, serial_number: "HP2035-1005", inventory_number: "INV-1005", ip_address: "192.168.10.25", mac_address: "00:11:22:33:44:05", current_location_id: 5, status: "in_work", notes: null, is_archived: false },
  { id: 6, printer_model_id: 6, serial_number: "BR2550-1006", inventory_number: "INV-1006", ip_address: "192.168.10.26", mac_address: "00:11:22:33:44:06", current_location_id: 6, status: "in_work", notes: null, is_archived: false },
  { id: 7, printer_model_id: 7, serial_number: "CN3010-1007", inventory_number: "INV-1007", ip_address: "192.168.10.27", mac_address: "00:11:22:33:44:07", current_location_id: 7, status: "in_work", notes: null, is_archived: false },
  { id: 8, printer_model_id: 8, serial_number: "KY2040-1008", inventory_number: "INV-1008", ip_address: "192.168.10.28", mac_address: "00:11:22:33:44:08", current_location_id: 8, status: "in_work", notes: null, is_archived: false },
  { id: 9, printer_model_id: 9, serial_number: "HP428-1009", inventory_number: "INV-1009", ip_address: "192.168.10.29", mac_address: "00:11:22:33:44:09", current_location_id: 2, status: "in_work", notes: "MFP", is_archived: false },
  { id: 10, printer_model_id: 10, serial_number: "SM2020-1010", inventory_number: "INV-1010", ip_address: null, mac_address: "00:11:22:33:44:10", current_location_id: 3, status: "written_off", notes: "Written off in demo history", is_archived: true },
];

export const demoInstalledCartridges: InstalledCartridge[] = [
  { id: 1, printer_id: 1, cartridge_model_id: 1, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-05-05T08:30:00Z", status: "installed" },
  { id: 2, printer_id: 2, cartridge_model_id: 3, slot_name: "Black", color_role: "black", item_condition: "refilled", installed_at: "2026-05-06T09:00:00Z", status: "installed" },
  { id: 3, printer_id: 3, cartridge_model_id: 5, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-05-07T11:00:00Z", status: "installed" },
  { id: 4, printer_id: 8, cartridge_model_id: 6, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-05-08T13:20:00Z", status: "installed" },
  { id: 5, printer_id: 9, cartridge_model_id: 1, slot_name: "Black", color_role: "black", item_condition: "refilled", installed_at: "2026-05-10T15:45:00Z", status: "installed" },
];

export const demoCartridgeStock: CartridgeStock[] = [
  { cartridge_model_id: 1, model_name: "HP CF259A", purchase_sku: "CF259A", stock_new: 6, stock_refilled: 2, installed_total: 2, total: 10, min_stock_level: 4 },
  { cartridge_model_id: 2, model_name: "HP CF283A", purchase_sku: "CF283A", stock_new: 2, stock_refilled: 1, installed_total: 0, total: 3, min_stock_level: 3 },
  { cartridge_model_id: 3, model_name: "Brother TN-2375", purchase_sku: "TN-2375", stock_new: 4, stock_refilled: 3, installed_total: 1, total: 8, min_stock_level: 3 },
  { cartridge_model_id: 4, model_name: "HP CE285A", purchase_sku: "CE285A", stock_new: 1, stock_refilled: 1, installed_total: 0, total: 2, min_stock_level: 2 },
  { cartridge_model_id: 5, model_name: "Canon 725", purchase_sku: "725", stock_new: 3, stock_refilled: 0, installed_total: 1, total: 4, min_stock_level: 2 },
  { cartridge_model_id: 6, model_name: "Kyocera TK-1160", purchase_sku: "TK-1160", stock_new: 2, stock_refilled: 2, installed_total: 1, total: 5, min_stock_level: 2 },
  { cartridge_model_id: 7, model_name: "Samsung MLT-D111S", purchase_sku: "MLT-D111S", stock_new: 0, stock_refilled: 1, installed_total: 0, total: 1, min_stock_level: 2 },
];

export const demoCartridgeTransactions: CartridgeTransaction[] = [
  tx(1, 1, "stock_in_new", 8, "new", null, "Initial stock", "Demo opening balance", "2026-04-01T08:00:00Z"),
  tx(2, 3, "stock_in_new", 6, "new", null, "Initial stock", null, "2026-04-01T08:05:00Z"),
  tx(3, 5, "stock_in_new", 4, "new", null, "Initial stock", null, "2026-04-02T09:00:00Z"),
  tx(4, 6, "stock_in_new", 3, "new", null, "Initial stock", null, "2026-04-02T09:10:00Z"),
  tx(5, 1, "install", 1, "new", 1, "Replacement", "Installed in IT", "2026-04-10T10:00:00Z"),
  tx(6, 3, "install", 1, "new", 2, "Replacement", null, "2026-04-11T11:00:00Z"),
  tx(7, 5, "install", 1, "new", 3, "Replacement", null, "2026-04-12T11:30:00Z"),
  tx(8, 1, "stock_in_refilled", 3, "refilled", null, "Refill return", null, "2026-04-15T12:00:00Z"),
  tx(9, 4, "stock_in_new", 2, "new", null, "Purchase", null, "2026-04-16T09:20:00Z"),
  tx(10, 2, "stock_in_new", 3, "new", null, "Purchase", null, "2026-04-16T09:25:00Z"),
  tx(11, 6, "install", 1, "new", 8, "Replacement", null, "2026-04-20T14:00:00Z"),
  tx(12, 1, "remove", 1, "new", 1, "Empty", "Removed from IT printer", "2026-04-25T16:00:00Z"),
  tx(13, 1, "send_to_refill", 1, "new", 1, "Empty", null, "2026-04-25T16:05:00Z"),
  tx(14, 1, "receive_from_refill", 1, "refilled", null, "Refill complete", null, "2026-05-02T10:00:00Z"),
  tx(15, 1, "install", 1, "refilled", 9, "Replacement", "MFP finance", "2026-05-03T10:30:00Z"),
  tx(16, 3, "receive_from_refill", 2, "refilled", null, "Refill complete", null, "2026-05-04T09:00:00Z"),
  tx(17, 3, "install", 1, "refilled", 2, "Replacement", null, "2026-05-06T09:00:00Z"),
  tx(18, 5, "install", 1, "new", 3, "Replacement", null, "2026-05-07T11:00:00Z"),
  tx(19, 6, "install", 1, "new", 8, "Replacement", null, "2026-05-08T13:20:00Z"),
  tx(20, 2, "correction_minus", 1, "new", null, "Damaged package", null, "2026-05-09T15:00:00Z"),
  tx(21, 7, "write_off", 1, "new", 10, "Printer written off", null, "2026-05-11T12:00:00Z"),
  tx(22, 4, "correction_plus", 1, "refilled", null, "Found on shelf", null, "2026-05-12T09:30:00Z"),
];

function tx(
  id: number,
  cartridge_model_id: number,
  transaction_type: string,
  quantity: number,
  item_condition: string | null,
  printer_id: number | null,
  reason: string | null,
  comment: string | null,
  created_at: string,
): CartridgeTransaction {
  return { id, cartridge_model_id, transaction_type, quantity, item_condition, printer_id, reason, comment, created_at };
}

export const demoPrinterLocationHistory: PrinterLocationHistory[] = [
  { id: 1, printer_id: 1, from_location_id: null, to_location_id: 1, moved_at: "2026-03-20T09:00:00Z", reason: "Commissioning", notes: "Demo printer placed in IT" },
  { id: 2, printer_id: 2, from_location_id: 3, to_location_id: 2, moved_at: "2026-04-18T10:00:00Z", reason: "Moved to finance", notes: null },
  { id: 3, printer_id: 4, from_location_id: 4, to_location_id: 5, moved_at: "2026-05-12T14:00:00Z", reason: "Sent for diagnostics", notes: null },
  { id: 4, printer_id: 8, from_location_id: 6, to_location_id: 8, moved_at: "2026-05-14T11:00:00Z", reason: "Room change", notes: "Quick move from list" },
];

export const demoPrinterRepairs: PrinterRepair[] = [
  { id: 1, printer_id: 4, repair_status: "sent", sent_at: "2026-05-12T14:10:00Z", returned_at: null, service_company: "Demo Service LLC", reason: "Paper feed issue", notes: "Pickup requested", result: null },
  { id: 2, printer_id: 5, repair_status: "returned", sent_at: "2026-04-05T10:00:00Z", returned_at: "2026-04-09T17:00:00Z", service_company: "Demo Service LLC", reason: "Roller replacement", notes: null, result: "Roller replaced" },
];

export const demoPrinterArchiveHistory: PrinterArchiveHistory[] = [
  { id: 1, printer_id: 10, archive_reason: "written_off", archived_at: "2026-05-11T12:30:00Z", comment: "Demo written-off printer" },
];

export const demoPrinterCartridgeHistory: PrinterCartridgeHistory[] = [
  { id: 1, printer_id: 1, cartridge_model_id: 1, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-04-10T10:00:00Z", removed_at: "2026-04-25T16:00:00Z", removal_reason: "Empty", notes: null },
  { id: 2, printer_id: 1, cartridge_model_id: 1, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-05-05T08:30:00Z", removed_at: null, removal_reason: null, notes: null },
  { id: 3, printer_id: 2, cartridge_model_id: 3, slot_name: "Black", color_role: "black", item_condition: "refilled", installed_at: "2026-05-06T09:00:00Z", removed_at: null, removal_reason: null, notes: null },
  { id: 4, printer_id: 3, cartridge_model_id: 5, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-05-07T11:00:00Z", removed_at: null, removal_reason: null, notes: null },
  { id: 5, printer_id: 8, cartridge_model_id: 6, slot_name: "Black", color_role: "black", item_condition: "new", installed_at: "2026-05-08T13:20:00Z", removed_at: null, removal_reason: null, notes: null },
  { id: 6, printer_id: 9, cartridge_model_id: 1, slot_name: "Black", color_role: "black", item_condition: "refilled", installed_at: "2026-05-03T10:30:00Z", removed_at: null, removal_reason: null, notes: null },
];

export const demoBackups: BackupFile[] = [
  { filename: "printledger_backup_2026-05-14_20-00-00.dump", size_bytes: 2_410_312, modified_at: "2026-05-14T20:00:00Z", download_url: "/api/backups/printledger_backup_2026-05-14_20-00-00.dump/download" },
  { filename: "printledger_backup_2026-05-15_20-00-00.dump", size_bytes: 2_460_928, modified_at: "2026-05-15T20:00:00Z", download_url: "/api/backups/printledger_backup_2026-05-15_20-00-00.dump/download" },
  { filename: "printledger_pre_restore_2026-05-16_11-30-00.dump", size_bytes: 2_452_110, modified_at: "2026-05-16T11:30:00Z", download_url: "/api/backups/printledger_pre_restore_2026-05-16_11-30-00.dump/download" },
];

export const demoUsers: AppUser[] = [
  { id: 1, username: "demo-admin", role: "admin", is_active: true },
  { id: 2, username: "operator", role: "user", is_active: true },
];

const compatiblePrinterModelByCartridge = new Map<number, number[]>([
  [1, [1, 9]],
  [2, [1]],
  [3, [2, 6]],
  [4, [5]],
  [5, [3, 7]],
  [6, [8]],
  [7, [10]],
]);

export function demoCompatiblePrinterModels(cartridgeModelId: number): PrinterModel[] {
  const ids = compatiblePrinterModelByCartridge.get(cartridgeModelId) ?? [];
  return demoPrinterModels.filter((model) => ids.includes(model.id) && model.is_active);
}

export function demoCompatibleCartridgeModels(printerModelId: number): CartridgeModel[] {
  const cartridgeIds = [...compatiblePrinterModelByCartridge.entries()]
    .filter(([, printerModelIds]) => printerModelIds.includes(printerModelId))
    .map(([cartridgeModelId]) => cartridgeModelId);
  return demoCartridgeModels.filter((model) => cartridgeIds.includes(model.id) && model.is_active);
}

export function demoSystemInfo() {
  return { app_name: "PrintLedger", version: "0.1.0-demo", environment: "demo", auth_enabled: true };
}

export function demoAnalytics(days: number, cartridgeModelId?: number): CartridgeUsageAnalytics {
  const periodFactor = days / 30;
  const rows = demoCartridgeStock
    .filter((stock) => !cartridgeModelId || stock.cartridge_model_id === cartridgeModelId)
    .map((stock) => {
      const usage = demoCartridgeTransactions
        .filter((transaction) => transaction.cartridge_model_id === stock.cartridge_model_id)
        .filter((transaction) => transaction.transaction_type === "install" || transaction.transaction_type === "write_off")
        .length;
      const usageInPeriod = Math.max(0, Math.round(usage * Math.min(periodFactor, 3)));
      const avgMonthlyUsage = usageInPeriod / periodFactor;
      const currentStockTotal = stock.stock_new + stock.stock_refilled;
      const recommendedPurchase1m = Math.max(0, Math.ceil(avgMonthlyUsage - currentStockTotal));
      const recommendedPurchase3m = Math.max(0, Math.ceil(avgMonthlyUsage * 3 - currentStockTotal));
      const model = demoCartridgeModels.find((item) => item.id === stock.cartridge_model_id);
      return {
        cartridge_model_id: stock.cartridge_model_id,
        model_name: stock.model_name,
        purchase_sku: stock.purchase_sku,
        min_stock_level: stock.min_stock_level,
        is_active: model?.is_active ?? true,
        current_stock_new: stock.stock_new,
        current_stock_refilled: stock.stock_refilled,
        current_stock_total: currentStockTotal,
        usage_in_period: usageInPeriod,
        avg_monthly_usage: avgMonthlyUsage,
        months_of_stock_left: avgMonthlyUsage > 0 ? currentStockTotal / avgMonthlyUsage : null,
        recommended_purchase_1m: recommendedPurchase1m,
        recommended_purchase_3m: recommendedPurchase3m,
        needs_purchase_1m: recommendedPurchase1m > 0,
        needs_purchase_3m: recommendedPurchase3m > 0,
      };
    });

  return {
    period_days: days,
    total_usage: rows.reduce((sum, row) => sum + row.usage_in_period, 0),
    total_current_stock: rows.reduce((sum, row) => sum + row.current_stock_total, 0),
    total_recommended_purchase_1m: rows.reduce((sum, row) => sum + row.recommended_purchase_1m, 0),
    total_recommended_purchase_3m: rows.reduce((sum, row) => sum + row.recommended_purchase_3m, 0),
    models_needing_purchase_3m: rows.filter((row) => row.needs_purchase_3m).length,
    rows,
    monthly_breakdown: cartridgeModelId
      ? [
          { month: "2026-03", usage: 1 },
          { month: "2026-04", usage: 2 },
          { month: "2026-05", usage: rows[0]?.usage_in_period ?? 0 },
        ]
      : null,
  };
}

export function demoFetch(path: string): unknown {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);

  if (pathname === "/health") return { status: "ok" };
  if (pathname === "/api/db-check") return { database: "ok" };
  if (pathname === "/api/system/info") return demoSystemInfo();
  if (pathname === "/api/auth/me") return demoUsers[0];
  if (pathname === "/api/users") return demoUsers;
  if (pathname === "/api/backups") return demoBackups;
  if (pathname === "/api/organizations") return demoOrganizations;
  if (pathname === "/api/branches") return demoBranches;
  if (pathname === "/api/locations") return demoLocations;
  if (pathname === "/api/printer-models") return demoPrinterModels;
  if (pathname === "/api/cartridge-models") return demoCartridgeModels;
  if (pathname === "/api/printers/archived") return demoPrinters.filter((printer) => printer.is_archived || printer.status === "archived" || printer.status === "written_off");
  if (pathname === "/api/printers") return demoPrinters;
  if (pathname === "/api/cartridge-stock") return demoCartridgeStock;
  if (pathname === "/api/cartridge-transactions") return filterTransactions(params);
  if (pathname === "/api/analytics/cartridge-usage") return demoAnalytics(Number(params.get("days") ?? 30), numberParam(params.get("cartridge_model_id")));

  const printerMatch = pathname.match(/^\/api\/printers\/(\d+)$/);
  if (printerMatch) return findById(demoPrinters, Number(printerMatch[1]));
  const printerModelMatch = pathname.match(/^\/api\/printer-models\/(\d+)$/);
  if (printerModelMatch) return findById(demoPrinterModels, Number(printerModelMatch[1]));
  const cartridgeModelMatch = pathname.match(/^\/api\/cartridge-models\/(\d+)$/);
  if (cartridgeModelMatch) return findById(demoCartridgeModels, Number(cartridgeModelMatch[1]));

  const installedMatch = pathname.match(/^\/api\/printers\/(\d+)\/installed-cartridges$/);
  if (installedMatch) return demoInstalledCartridges.filter((item) => item.printer_id === Number(installedMatch[1]) && item.status === "installed");
  const printerCartridgeHistoryMatch = pathname.match(/^\/api\/printers\/(\d+)\/cartridge-history$/);
  if (printerCartridgeHistoryMatch) return demoPrinterCartridgeHistory.filter((item) => item.printer_id === Number(printerCartridgeHistoryMatch[1]));
  const locationHistoryMatch = pathname.match(/^\/api\/printers\/(\d+)\/location-history$/);
  if (locationHistoryMatch) return demoPrinterLocationHistory.filter((item) => item.printer_id === Number(locationHistoryMatch[1]));
  const repairsMatch = pathname.match(/^\/api\/printers\/(\d+)\/repairs$/);
  if (repairsMatch) return demoPrinterRepairs.filter((item) => item.printer_id === Number(repairsMatch[1]));
  const archiveHistoryMatch = pathname.match(/^\/api\/printers\/(\d+)\/archive-history$/);
  if (archiveHistoryMatch) return demoPrinterArchiveHistory.filter((item) => item.printer_id === Number(archiveHistoryMatch[1]));

  const cartridgeHistoryMatch = pathname.match(/^\/api\/cartridge-models\/(\d+)\/history$/);
  if (cartridgeHistoryMatch) return demoCartridgeTransactions.filter((item) => item.cartridge_model_id === Number(cartridgeHistoryMatch[1]));
  const compatiblePrintersMatch = pathname.match(/^\/api\/cartridge-models\/(\d+)\/compatible-printer-models$/);
  if (compatiblePrintersMatch) return demoCompatiblePrinterModels(Number(compatiblePrintersMatch[1]));
  const compatibleCartridgesMatch = pathname.match(/^\/api\/printer-models\/(\d+)\/compatible-cartridge-models$/);
  if (compatibleCartridgesMatch) return demoCompatibleCartridgeModels(Number(compatibleCartridgesMatch[1]));

  return null;
}

function filterTransactions(params: URLSearchParams): CartridgeTransaction[] {
  return demoCartridgeTransactions.filter((transaction) => {
    const cartridgeModelId = numberParam(params.get("cartridge_model_id"));
    const printerId = numberParam(params.get("printer_id"));
    const transactionType = params.get("transaction_type");
    return (
      (!cartridgeModelId || transaction.cartridge_model_id === cartridgeModelId) &&
      (!printerId || transaction.printer_id === printerId) &&
      (!transactionType || transaction.transaction_type === transactionType)
    );
  });
}

function findById<T extends { id: number }>(items: T[], id: number): T | null {
  return items.find((item) => item.id === id) ?? null;
}

function numberParam(value: string | null): number | undefined {
  return value ? Number(value) : undefined;
}

export function demoBackupBlob(): Blob {
  return new Blob(["PrintLedger demo backup placeholder\n"], { type: "application/octet-stream" });
}

export { now as demoNow };
