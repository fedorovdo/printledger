import { demoCartridgeModels } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demoMode";

import CartridgeCardClient from "./CartridgeCardClient";

export function generateStaticParams() {
  if (!isDemoMode()) {
    return [];
  }
  return demoCartridgeModels.map((cartridgeModel) => ({ id: String(cartridgeModel.id) }));
}

export default function CartridgeCardPage() {
  return <CartridgeCardClient />;
}
