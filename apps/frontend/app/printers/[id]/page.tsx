import { demoPrinters } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demoMode";

import PrinterCardClient from "./PrinterCardClient";

export function generateStaticParams() {
  if (!isDemoMode()) {
    return [];
  }
  return demoPrinters.map((printer) => ({ id: String(printer.id) }));
}

export default function PrinterCardPage() {
  return <PrinterCardClient />;
}
