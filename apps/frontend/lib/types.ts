export type CartridgeStock = {
  cartridge_model_id: number;
  model_name: string;
  purchase_sku: string | null;
  stock_new: number;
  stock_refilled: number;
  installed_total: number;
  total: number;
  min_stock_level: number;
};

export type CartridgeModel = {
  id: number;
  vendor: string | null;
  model_name: string;
  purchase_sku: string | null;
  cartridge_type: string;
  min_stock_level: number;
  notes: string | null;
  is_active: boolean;
};

export type PrinterModel = {
  id: number;
  vendor: string | null;
  name: string;
  print_technology: string;
  color_mode: string;
  cartridge_slots_count: number;
};

export type Printer = {
  id: number;
  printer_model_id: number;
  serial_number: string | null;
  inventory_number: string | null;
  ip_address: string | null;
  mac_address: string | null;
  current_location_id: number | null;
  status: string;
  notes: string | null;
  is_archived: boolean;
};

export type InstalledCartridge = {
  id: number;
  printer_id: number;
  cartridge_model_id: number;
  slot_name: string | null;
  color_role: string | null;
  item_condition: string;
  installed_at: string;
  status: string;
};

export type PrinterRepair = {
  id: number;
  printer_id: number;
  repair_status: string;
  sent_at: string | null;
  returned_at: string | null;
  service_company: string | null;
  reason: string | null;
  notes: string | null;
  result: string | null;
};

export type Organization = {
  id: number;
  name: string;
  short_name: string | null;
  notes: string | null;
  is_active: boolean;
};

export type Branch = {
  id: number;
  organization_id: number;
  name: string;
  address: string | null;
  notes: string | null;
  is_active: boolean;
};

export type Location = {
  id: number;
  organization_id: number;
  branch_id: number | null;
  department: string | null;
  room: string | null;
  display_name: string;
  notes: string | null;
  is_active: boolean;
};

export type CartridgeTransaction = {
  id: number;
  cartridge_model_id: number;
  transaction_type: string;
  quantity: number;
  item_condition: string | null;
  printer_id: number | null;
  reason: string | null;
  comment: string | null;
  created_at: string;
};

export type PrinterCartridgeHistory = {
  id: number;
  printer_id: number;
  cartridge_model_id: number;
  slot_name: string | null;
  color_role: string | null;
  item_condition: string;
  installed_at: string;
  removed_at: string | null;
  removal_reason: string | null;
  notes: string | null;
};

export type PrinterLocationHistory = {
  id: number;
  printer_id: number;
  from_location_id: number | null;
  to_location_id: number | null;
  moved_at: string;
  reason: string | null;
  notes: string | null;
};

export type PrinterArchiveHistory = {
  id: number;
  printer_id: number;
  archive_reason: string;
  archived_at: string;
  comment: string | null;
};

export type BackupFile = {
  filename: string;
  size_bytes: number;
  modified_at: string;
  download_url: string;
};
