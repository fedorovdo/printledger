"use client";

import type { FormEvent } from "react";

import { useI18n } from "@/lib/i18n";
import { formatCartridgeType } from "@/lib/labels";
import type { CartridgeModel } from "@/lib/types";

export type CartridgeModelFormValues = {
  vendor: string;
  model_name: string;
  purchase_sku: string;
  cartridge_type: string;
  min_stock_level: string;
  notes: string;
};

export const emptyCartridgeModelFormValues: CartridgeModelFormValues = {
  vendor: "",
  model_name: "",
  purchase_sku: "",
  cartridge_type: "toner",
  min_stock_level: "0",
  notes: "",
};

export function cartridgeModelToFormValues(model: CartridgeModel): CartridgeModelFormValues {
  return {
    vendor: model.vendor ?? "",
    model_name: model.model_name,
    purchase_sku: model.purchase_sku ?? "",
    cartridge_type: model.cartridge_type,
    min_stock_level: String(model.min_stock_level),
    notes: model.notes ?? "",
  };
}

export function cartridgeModelFormPayload(values: CartridgeModelFormValues) {
  return {
    ...values,
    min_stock_level: Number(values.min_stock_level),
  };
}

export function CartridgeModelForm({
  catalogHint = false,
  onCancel,
  onChange,
  onSubmit,
  saving,
  values,
  vendorSuggestions = [],
}: {
  catalogHint?: boolean;
  onCancel: () => void;
  onChange: (values: CartridgeModelFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  values: CartridgeModelFormValues;
  vendorSuggestions?: string[];
}) {
  const { locale, t } = useI18n();

  return (
    <form className="panel" onSubmit={onSubmit}>
      {catalogHint && <p className="muted">{t.cartridgeModelCatalogHint}</p>}
      <label>
        {t.vendor}
        <input
          list="cartridge-vendor-suggestions"
          value={values.vendor}
          onChange={(event) => onChange({ ...values, vendor: event.target.value })}
        />
      </label>
      <datalist id="cartridge-vendor-suggestions">
        {vendorSuggestions.map((vendor) => <option key={vendor} value={vendor} />)}
      </datalist>
      <label>
        {t.modelName}
        <input required value={values.model_name} onChange={(event) => onChange({ ...values, model_name: event.target.value })} />
      </label>
      <label>
        {t.sku}
        <input value={values.purchase_sku} onChange={(event) => onChange({ ...values, purchase_sku: event.target.value })} />
      </label>
      <label>
        {t.cartridgeType}
        <select value={values.cartridge_type} onChange={(event) => onChange({ ...values, cartridge_type: event.target.value })}>
          <option value="toner">{formatCartridgeType("toner", locale)}</option>
          <option value="ink">{formatCartridgeType("ink", locale)}</option>
          <option value="other">{formatCartridgeType("other", locale)}</option>
        </select>
      </label>
      <label>
        {t.minStockLevel}
        <input min="0" required step="1" type="number" value={values.min_stock_level} onChange={(event) => onChange({ ...values, min_stock_level: event.target.value })} />
      </label>
      <label>
        {t.notes}
        <textarea value={values.notes} onChange={(event) => onChange({ ...values, notes: event.target.value })} />
      </label>
      <div className="inline-actions">
        <button className="button" disabled={saving} type="submit">{t.save}</button>
        <button className="button secondary" disabled={saving} onClick={onCancel} type="button">{t.cancel}</button>
      </div>
    </form>
  );
}
