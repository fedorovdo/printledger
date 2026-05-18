export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function demoReadOnlyMessage(): string {
  if (typeof window !== "undefined" && window.localStorage.getItem("printledger-locale") === "en") {
    return "Demo mode: data changes are disabled.";
  }
  return "Демо-режим: изменение данных отключено.";
}
