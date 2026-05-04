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
  is_archived: boolean;
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
  comment: string | null;
  created_at: string;
};

